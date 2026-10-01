// 太字の科目や見出しだけが文字でなく図形で描かれたPDFを読む。
// テキスト層にある文字はそのまま使い、テキスト層に無い部分だけを macOS の Vision で補う。
// 出力は pdftotext -layout に似せ、同じ高さの文字列を1行にして横位置で桁を揃える。
//
//     swift scripts/ocr_pdf.swift data/raw/saga/fy2024.pdf > data/raw/saga/fy2024.txt
//
// Vision は解像度によって金額を上下逆に読んだり、カンマを点や空白にしたりする。
// 3つの倍率で読み、同じ位置で2回以上一致した読み（空白は無視）を採る。

import AppKit
import Foundation
import PDFKit
import Vision

let columns: CGFloat = 160
let scales: [CGFloat] = [5, 6, 7]

typealias Piece = (box: CGRect, text: String)

/// テキスト層の語をページごとに。座標は Vision と同じく左下原点の 0–1。
/// PDFKit の characterBounds は page.string の位置とずれるので、pdftotext -bbox を使う。
func textLayer(_ path: String) throws -> [[Piece]] {
  let process = Process()
  process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
  process.arguments = ["pdftotext", "-bbox", path, "-"]
  let pipe = Pipe()
  process.standardOutput = pipe
  process.standardError = FileHandle.nullDevice
  try process.run()
  let html = String(decoding: pipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
  process.waitUntilExit()

  let number = { (tag: Substring, name: String) -> CGFloat in
    let value = tag.firstMatch(of: try! Regex("\(name)=\"([0-9.]+)\""))?.output[1].substring
    return CGFloat(Double(value ?? "0") ?? 0)
  }
  let wordText = try! Regex("\">(.*)</word>")
  var pages: [[Piece]] = []
  var width: CGFloat = 1
  var height: CGFloat = 1
  for line in html.split(separator: "\n") {
    if line.contains("<page ") {
      width = number(line, "width")
      height = number(line, "height")
      pages.append([])
    } else if line.contains("<word "),
      let text = line.firstMatch(of: wordText)?.output[1].substring.map(String.init)
    {
      let minX = number(line, "xMin"), maxX = number(line, "xMax")
      let minY = number(line, "yMin"), maxY = number(line, "yMax")
      let box = CGRect(
        x: minX / width, y: 1 - maxY / height,
        width: (maxX - minX) / width, height: (maxY - minY) / height)
      let word = text.replacingOccurrences(of: "&amp;", with: "&")
        .replacingOccurrences(of: "&lt;", with: "<")
        .replacingOccurrences(of: "&gt;", with: ">")
        .replacingOccurrences(of: "&quot;", with: "\"")
      pages[pages.count - 1].append((box, word))
    }
  }
  return pages
}

func recognize(_ page: PDFPage, scale: CGFloat) throws -> [Piece] {
  let box = page.bounds(for: .mediaBox)
  let size = CGSize(width: box.width * scale, height: box.height * scale)
  var rect = CGRect(origin: .zero, size: size)
  guard let image = page.thumbnail(of: size, for: .mediaBox)
    .cgImage(forProposedRect: &rect, context: nil, hints: nil)
  else { return [] }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.recognitionLanguages = ["ja-JP"]
  request.usesLanguageCorrection = false
  try VNImageRequestHandler(cgImage: image).perform([request])
  return (request.results ?? []).compactMap { observation in
    guard let text = observation.topCandidates(1).first?.string else { return nil }
    return (observation.boundingBox, text)
  }
}

func area(_ rect: CGRect) -> CGFloat {
  rect.isNull ? 0 : rect.width * rect.height
}

func overlap(_ a: CGRect, _ b: CGRect) -> CGFloat {
  area(a.intersection(b)) / max(area(a), area(b))
}

func vote(_ base: Piece, _ runs: [[Piece]]) -> String {
  let readings = runs.flatMap { run in run.filter { overlap($0.box, base.box) > 0.5 }.map(\.text) }
  let key = { (text: String) in text.filter { !$0.isWhitespace } }
  let counts = Dictionary(grouping: readings, by: key)
  guard let best = counts.max(by: { $0.value.count < $1.value.count }), best.value.count >= 2 else {
    return base.text
  }
  return best.key == key(base.text) ? base.text : best.value[0]
}

guard CommandLine.arguments.count == 2,
  let document = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))
else {
  FileHandle.standardError.write("usage: swift scripts/ocr_pdf.swift <pdf>\n".data(using: .utf8)!)
  exit(1)
}

let layers = try textLayer(CommandLine.arguments[1])

for index in 0..<document.pageCount {
  guard let page = document.page(at: index) else { continue }
  let text = index < layers.count ? layers[index] : []
  let runs = try scales.map { try recognize(page, scale: $0) }
  let filled = runs[1]
    .filter { piece in
      let covered = text.reduce(0) { $0 + area(piece.box.intersection($1.box)) }
      return covered < area(piece.box) * 0.3
    }
    .map { base in (box: base.box, text: vote(base, runs)) }
  let pieces = (text + filled).sorted { $0.box.midY > $1.box.midY }

  var rows: [[Piece]] = []
  for piece in pieces {
    if let head = rows.last?.first, abs(head.box.midY - piece.box.midY) < head.box.height * 0.5 {
      rows[rows.count - 1].append(piece)
    } else {
      rows.append([piece])
    }
  }

  for row in rows {
    var line = ""
    for piece in row.sorted(by: { $0.box.minX < $1.box.minX }) {
      let column = Int(piece.box.minX * columns)
      if line.count < column {
        line += String(repeating: " ", count: column - line.count)
      } else if !line.isEmpty {
        line += "  "
      }
      line += piece.text
    }
    print(line)
  }
  print("\u{0C}", terminator: "")
}
