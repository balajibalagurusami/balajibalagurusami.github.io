/**
 * docx-lite — build a real .docx file in the browser with no dependencies.
 *
 * A .docx is a ZIP archive of XML parts. This library writes both by hand,
 * including the deflate compression — enough of it to pack the parts, and no
 * more: LZ77 with the fixed Huffman tables the format already defines.
 *
 * Works offline and under a strict Content-Security-Policy, because nothing is
 * fetched and nothing leaves the page.
 *
 *   var blob = docxLite.build('Privacy policy', text);
 *
 * See README.md for the block API and options.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.docxLite = factory();
    // Historical name kept so existing callers do not break.
    root.cxDocx = root.docxLite;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  var DEFAULTS = {
    creator: 'docx-lite',
    lang: 'en-US',
    font: 'Times New Roman',
    fontSize: 12,      // points
    justify: true,     // justified body text
    compress: true,    // deflate the parts; false stores them uncompressed
    pageSize: 'A4'
  };

  var PAGE_SIZES = {          // twentieths of a point
    A4: { w: 11906, h: 16838 },
    LETTER: { w: 12240, h: 15840 }
  };

  // ---------------------------------------------------------------- ZIP ----

  var crcTable = null;

  function buildCrcTable() {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  }

  function crc32(bytes) {
    if (!crcTable) crcTable = buildCrcTable();
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function dosStamp(d) {
    return {
      time: ((d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)) & 0xFFFF,
      date: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF
    };
  }

  // ------------------------------------------------------------ deflate ----
  //
  // Only the compressing half of deflate, and only with the fixed Huffman
  // tables the format already defines — no dynamic tables, no decompressor,
  // no compression levels. That is a deliberate trade: on this data almost
  // the entire win comes from LZ77 finding repeated markup, not from tuning
  // the code lengths. Measured on a 423 KB document.xml, zlib at its fastest
  // setting produced 6.8 KB and at its most thorough 6.5 KB — four per cent
  // apart. Fixed tables give up a little of that and save most of the code.

  var LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35,
                     43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3,
                      4, 4, 4, 4, 5, 5, 5, 5, 0];
  var DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257,
                   385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289,
                   16385, 24577];
  var DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9,
                    9, 10, 10, 11, 11, 12, 12, 13, 13];

  var WINDOW = 32768, MIN_MATCH = 3, MAX_MATCH = 258, MAX_CHAIN = 32;

  // Deflate packs bits into bytes low end first, but a Huffman code is read
  // high bit first, so each code is reversed before it is written.
  function reverseBits(code, length) {
    var out = 0;
    for (var i = 0; i < length; i++) {
      out = (out << 1) | (code & 1);
      code >>>= 1;
    }
    return out;
  }

  var fixedCodes = null;

  function buildFixedCodes() {
    var code = new Uint16Array(288), len = new Uint8Array(288);
    for (var i = 0; i < 288; i++) {
      if (i < 144) { code[i] = 0x30 + i; len[i] = 8; }
      else if (i < 256) { code[i] = 0x190 + i - 144; len[i] = 9; }
      else if (i < 280) { code[i] = i - 256; len[i] = 7; }
      else { code[i] = 0xC0 + i - 280; len[i] = 8; }
      code[i] = reverseBits(code[i], len[i]);
    }
    var dist = new Uint8Array(30);
    for (var d = 0; d < 30; d++) dist[d] = reverseBits(d, 5);
    return { code: code, len: len, dist: dist };
  }

  function BitWriter() {
    this.out = [];
    this.acc = 0;
    this.bits = 0;
  }

  BitWriter.prototype.write = function (value, bits) {
    this.acc |= (value << this.bits);
    this.bits += bits;
    while (this.bits >= 8) {
      this.out.push(this.acc & 0xFF);
      this.acc >>>= 8;
      this.bits -= 8;
    }
  };

  BitWriter.prototype.finish = function () {
    if (this.bits > 0) this.out.push(this.acc & 0xFF);
    return new Uint8Array(this.out);
  };

  function codeFor(value, base) {          // index of the largest base <= value
    var i = base.length - 1;
    while (i > 0 && base[i] > value) i--;
    return i;
  }

  /** Raw deflate stream (ZIP method 8) — no zlib or gzip wrapper. */
  function deflateRaw(data) {
    if (!fixedCodes) fixedCodes = buildFixedCodes();
    var codes = fixedCodes;
    var w = new BitWriter();
    w.write(1, 1);                          // final block
    w.write(1, 2);                          // fixed Huffman

    var n = data.length;
    var head = new Int32Array(65536).fill(-1);
    var prev = new Int32Array(n).fill(-1);

    function hash(i) {
      return ((data[i] << 10) ^ (data[i + 1] << 5) ^ data[i + 2]) & 0xFFFF;
    }

    function emitLiteral(byte) {
      w.write(codes.code[byte], codes.len[byte]);
    }

    var i = 0;
    while (i < n) {
      var bestLength = 0, bestDistance = 0;

      if (i + MIN_MATCH <= n) {
        var h = hash(i);
        var candidate = head[h];
        var chain = MAX_CHAIN;
        while (candidate >= 0 && chain-- > 0 && i - candidate <= WINDOW) {
          if (data[candidate + bestLength] === data[i + bestLength]) {
            var length = 0;
            while (length < MAX_MATCH && i + length < n &&
                   data[candidate + length] === data[i + length]) length++;
            if (length > bestLength) {
              bestLength = length;
              bestDistance = i - candidate;
              if (length === MAX_MATCH) break;
            }
          }
          candidate = prev[candidate];
        }
      }

      if (bestLength >= MIN_MATCH) {
        var lc = codeFor(bestLength, LENGTH_BASE);
        w.write(codes.code[257 + lc], codes.len[257 + lc]);
        if (LENGTH_EXTRA[lc]) w.write(bestLength - LENGTH_BASE[lc], LENGTH_EXTRA[lc]);
        var dc = codeFor(bestDistance, DIST_BASE);
        w.write(codes.dist[dc], 5);
        if (DIST_EXTRA[dc]) w.write(bestDistance - DIST_BASE[dc], DIST_EXTRA[dc]);
        // Every position inside the match still has to enter the chain, or
        // later matches will not find it.
        for (var k = 0; k < bestLength; k++) {
          if (i + k + MIN_MATCH <= n) {
            var hk = hash(i + k);
            prev[i + k] = head[hk];
            head[hk] = i + k;
          }
        }
        i += bestLength;
      } else {
        emitLiteral(data[i]);
        if (i + MIN_MATCH <= n) {
          var hi = hash(i);
          prev[i] = head[hi];
          head[hi] = i;
        }
        i++;
      }
    }

    w.write(codes.code[256], codes.len[256]);   // end of block
    return w.finish();
  }

  function zipParts(entries, compress) {
    var encoder = new TextEncoder();
    var stamp = dosStamp(new Date());
    var locals = [];
    var central = [];
    var offset = 0;

    entries.forEach(function (entry) {
      var name = encoder.encode(entry.name);
      var data = encoder.encode(entry.xml);
      var crc = crc32(data);

      // The checksum and the declared original size always describe the
      // uncompressed bytes, whichever method the entry ends up using.
      var payload = data;
      var method = 0;
      if (compress && data.length > 256) {
        var packed = deflateRaw(data);
        if (packed.length < data.length) { payload = packed; method = 8; }
      }

      var head = new Uint8Array(30 + name.length);
      var hv = new DataView(head.buffer);
      hv.setUint32(0, 0x04034b50, true);
      hv.setUint16(4, 20, true);
      hv.setUint16(6, 0x0800, true);   // UTF-8 names
      hv.setUint16(8, method, true);
      hv.setUint16(10, stamp.time, true);
      hv.setUint16(12, stamp.date, true);
      hv.setUint32(14, crc, true);
      hv.setUint32(18, payload.length, true);
      hv.setUint32(22, data.length, true);
      hv.setUint16(26, name.length, true);
      hv.setUint16(28, 0, true);
      head.set(name, 30);

      var dir = new Uint8Array(46 + name.length);
      var dv = new DataView(dir.buffer);
      dv.setUint32(0, 0x02014b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 20, true);
      dv.setUint16(8, 0x0800, true);
      dv.setUint16(10, method, true);
      dv.setUint16(12, stamp.time, true);
      dv.setUint16(14, stamp.date, true);
      dv.setUint32(16, crc, true);
      dv.setUint32(20, payload.length, true);
      dv.setUint32(24, data.length, true);
      dv.setUint16(28, name.length, true);
      dv.setUint32(42, offset, true);
      dir.set(name, 46);

      locals.push(head, payload);
      central.push(dir);
      offset += head.length + payload.length;
    });

    var centralSize = central.reduce(function (sum, part) { return sum + part.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    return locals.concat(central, [end]);
  }

  // --------------------------------------------------------------- OOXML ---

  // XML 1.0 forbids these outright — there is no escape sequence that would
  // make them legal. Text pasted from a terminal, a PDF or a database export
  // often carries a few, and leaving them in produces a file Word refuses to
  // open, so they are dropped. Characters XML merely discourages (U+007F to
  // U+009F) are valid and kept.
  var FORBIDDEN = /[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/g;
  // A lone surrogate cannot be encoded as UTF-8 and would corrupt the part.
  var LONE_HIGH = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g;
  var LONE_LOW = /(^|[^\uD800-\uDBFF])([\uDC00-\uDFFF])/g;

  function clean(s) {
    return String(s)
      .replace(FORBIDDEN, '')
      .replace(LONE_HIGH, '')
      .replace(LONE_LOW, '$1');
  }

  function esc(s) {
    return clean(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  var CONTENT_TYPES = DECL +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>';

  var ROOT_RELS = DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>';

  var REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  // Hyperlinks each need their own relationship, so this part depends on the
  // document body and is built after it.
  function docRels(links) {
    var xml = DECL +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="' + REL_NS + '/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="' + REL_NS + '/numbering" Target="numbering.xml"/>';
    links.forEach(function (href, i) {
      xml += '<Relationship Id="rId' + (i + 3) + '" Type="' + REL_NS + '/hyperlink"' +
             ' Target="' + esc(href) + '" TargetMode="External"/>';
    });
    return xml + '</Relationships>';
  }

  // Two numbering definitions: bullets and decimals, two levels each. Word
  // renders the marker itself, so the source text carries no dashes or digits.
  var LIST_INDENT = [
    { left: 454, hanging: 227 },
    { left: 908, hanging: 227 }
  ];

  function numberingLevel(ilvl, fmt, text) {
    var ind = LIST_INDENT[ilvl];
    return '<w:lvl w:ilvl="' + ilvl + '">' +
      '<w:start w:val="1"/><w:numFmt w:val="' + fmt + '"/>' +
      '<w:lvlText w:val="' + esc(text) + '"/><w:lvlJc w:val="left"/>' +
      '<w:pPr><w:ind w:left="' + ind.left + '" w:hanging="' + ind.hanging + '"/></w:pPr>' +
      '</w:lvl>';
  }

  /**
   * Bullets never need to restart, so they all share numId 1. Numbered lists
   * do: Word continues the count across every paragraph that points at the
   * same definition, which would turn a second list in the document into
   * items 3, 4, 5. Each run of consecutive ordered items therefore gets its
   * own w:num, and `orderedGroups` says how many to declare.
   */
  function numbering(orderedGroups) {
    var xml = DECL +
      '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:abstractNum w:abstractNumId="0">' +
      numberingLevel(0, 'bullet', '—') +
      numberingLevel(1, 'bullet', '–') +
      '</w:abstractNum>' +
      '<w:abstractNum w:abstractNumId="1">' +
      numberingLevel(0, 'decimal', '%1.') +
      numberingLevel(1, 'decimal', '%1.%2.') +
      '</w:abstractNum>' +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
    for (var i = 0; i < Math.max(orderedGroups, 1); i++) {
      xml += '<w:num w:numId="' + (i + 2) + '"><w:abstractNumId w:val="1"/>' +
             '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride>' +
             '<w:lvlOverride w:ilvl="1"><w:startOverride w:val="1"/></w:lvlOverride>' +
             '</w:num>';
    }
    return xml + '</w:numbering>';
  }

  // The order of children inside w:style and w:pPr is fixed by the OOXML
  // schema. Word refuses to open the file if it is wrong.
  function styles(opt) {
    var half = Math.round(opt.fontSize * 2);        // OOXML uses half-points
    var jc = opt.justify ? '<w:jc w:val="both"/>' : '';
    return DECL +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="' + esc(opt.font) + '" w:hAnsi="' + esc(opt.font) +
      '" w:cs="' + esc(opt.font) + '"/>' +
      '<w:sz w:val="' + half + '"/><w:szCs w:val="' + half + '"/>' +
      '<w:lang w:val="' + esc(opt.lang) + '"/>' +
      '</w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/>' +
      jc + '</w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="DocTitle"><w:name w:val="Doc Title"/>' +
      '<w:basedOn w:val="Normal"/><w:next w:val="DocBody"/><w:qFormat/>' +
      '<w:pPr><w:spacing w:after="360"/><w:jc w:val="center"/></w:pPr>' +
      '<w:rPr><w:b/><w:sz w:val="' + (half + 8) + '"/><w:szCs w:val="' + (half + 8) + '"/></w:rPr></w:style>' +
      heading(1, half + 2) + heading(2, half) + heading(3, half - 2) +
      '<w:style w:type="paragraph" w:styleId="DocBody"><w:name w:val="Doc Body"/>' +
      '<w:basedOn w:val="Normal"/><w:qFormat/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="DocList"><w:name w:val="Doc List"/>' +
      '<w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:spacing w:after="80"/><w:jc w:val="left"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="DocCell"><w:name w:val="Doc Cell"/>' +
      '<w:basedOn w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:spacing w:after="0"/><w:jc w:val="left"/></w:pPr></w:style>' +
      // outlineLvl is what puts a heading into Word's navigation pane.
      '<w:style w:type="character" w:styleId="DocLink"><w:name w:val="Doc Link"/>' +
      '<w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>' +
      '</w:styles>';
  }

  function heading(level, size) {
    var id = level === 1 ? 'DocHeading' : 'DocHeading' + level;
    var before = level === 1 ? 320 : 260;
    return '<w:style w:type="paragraph" w:styleId="' + id + '">' +
      '<w:name w:val="Doc Heading ' + level + '"/>' +
      '<w:basedOn w:val="Normal"/><w:next w:val="DocBody"/><w:qFormat/>' +
      '<w:pPr><w:keepNext/><w:spacing w:before="' + before + '" w:after="140"/>' +
      '<w:jc w:val="left"/><w:outlineLvl w:val="' + (level - 1) + '"/></w:pPr>' +
      '<w:rPr><w:b/><w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/></w:rPr></w:style>';
  }

  function core(title, opt) {
    var iso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    return DECL +
      '<cp:coreProperties' +
      ' xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"' +
      ' xmlns:dc="http://purl.org/dc/elements/1.1/"' +
      ' xmlns:dcterms="http://purl.org/dc/terms/"' +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + esc(title) + '</dc:title>' +
      '<dc:creator>' + esc(opt.creator) + '</dc:creator>' +
      '<cp:lastModifiedBy>' + esc(opt.creator) + '</cp:lastModifiedBy>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + iso + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + iso + '</dcterms:modified>' +
      '</cp:coreProperties>';
  }

  var STYLE_OF = {
    title: 'DocTitle',
    heading: 'DocHeading',
    body: 'DocBody',
    list: 'DocList',
    cell: 'DocCell'
  };

  function styleFor(block) {
    if (block.type === 'heading') {
      var lvl = Math.min(Math.max(parseInt(block.level, 10) || 1, 1), 3);
      return lvl === 1 ? 'DocHeading' : 'DocHeading' + lvl;
    }
    return STYLE_OF[block.type] || STYLE_OF.body;
  }

  // A block carries either `text` or a `runs` array; everything downstream
  // works with runs, so normalise once here.
  function runsOf(block) {
    if (block.runs && block.runs.length) return block.runs;
    return [{ text: block.text == null ? '' : block.text }];
  }

  // The order of children inside w:rPr is fixed by the schema: b, i, then
  // colour, then u.
  function runProps(run) {
    var props = '';
    if (run.bold) props += '<w:b/>';
    if (run.italic) props += '<w:i/>';
    if (run.underline && !run.link) props += '<w:u w:val="single"/>';
    if (run.link) props = '<w:rStyle w:val="DocLink"/>' + props;
    return props ? '<w:rPr>' + props + '</w:rPr>' : '';
  }

  function runXml(run) {
    return '<w:r>' + runProps(run) +
           '<w:t xml:space="preserve">' + esc(run.text == null ? '' : run.text) + '</w:t></w:r>';
  }

  /**
   * Renders runs, registering every hyperlink target in `links` so the
   * relationships part can be built afterwards. Ids start at rId3 because
   * styles and numbering already hold rId1 and rId2.
   */
  function runsXml(runs, links) {
    return runs.map(function (run) {
      if (!run.link) return runXml(run);
      var at = links.indexOf(run.link);
      if (at === -1) { links.push(run.link); at = links.length - 1; }
      return '<w:hyperlink r:id="rId' + (at + 3) + '">' + runXml(run) + '</w:hyperlink>';
    }).join('');
  }

  // numId 1 is the shared bullet definition; ordered lists get 2, 3, 4 … one
  // per group, so each starts again at 1.
  function numberingProps(block, numId) {
    if (block.type !== 'list') return '';
    var ilvl = Math.min(Math.max(parseInt(block.level, 10) || 0, 0), 1);
    return '<w:numPr><w:ilvl w:val="' + ilvl + '"/>' +
           '<w:numId w:val="' + (block.ordered ? numId : 1) + '"/></w:numPr>';
  }

  // Inside w:pPr the schema wants pStyle before numPr, and jc after both.
  function para(block, links, numId) {
    var align = block.align && block.align !== 'left'
      ? '<w:jc w:val="' + esc(block.align) + '"/>' : '';
    return '<w:p><w:pPr><w:pStyle w:val="' + styleFor(block) + '"/>' +
           numberingProps(block, numId) + align + '</w:pPr>' +
           runsXml(runsOf(block), links) + '</w:p>';
  }

  var PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

  var TABLE_BORDER = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map(function (side) {
      return '<w:' + side + ' w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>';
    }).join('');

  function cellXml(cell, header, links, width) {
    var block = (cell && typeof cell === 'object') ? cell : { text: cell };
    var run = { type: 'cell', text: block.text, runs: block.runs, align: block.align };
    if (header && !block.runs) {
      run.runs = [{ text: block.text == null ? '' : block.text, bold: true }];
    }
    return '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/></w:tcPr>' +
           para(run, links) + '</w:tc>';
  }

  /**
   * A table block: { type: 'table', rows: [[...], ...], header: true }.
   * Cells are strings or { text | runs, align }. The first row is bold when
   * `header` is set.
   */
  function tableXml(block, links, textWidth) {
    var rows = block.rows || [];
    var columns = rows.reduce(function (n, row) { return Math.max(n, row.length); }, 0);
    if (!columns) return '';

    // Declaring real widths rather than zeros keeps columns even. Left to
    // itself Word sizes them by content, which makes a table with one long
    // cell look lopsided.
    var column = Math.floor(textWidth / columns);
    var grid = '';
    for (var i = 0; i < columns; i++) grid += '<w:gridCol w:w="' + column + '"/>';

    var body = rows.map(function (row, index) {
      var cells = '';
      for (var c = 0; c < columns; c++) {
        cells += cellXml(row[c] == null ? '' : row[c], block.header && index === 0,
                         links, column);
      }
      return '<w:tr>' + cells + '</w:tr>';
    }).join('');

    return '<w:tbl><w:tblPr><w:tblW w:w="' + (column * columns) + '" w:type="dxa"/>' +
           '<w:tblBorders>' + TABLE_BORDER + '</w:tblBorders>' +
           '<w:tblCellMar><w:left w:w="108" w:type="dxa"/>' +
           '<w:right w:w="108" w:type="dxa"/></w:tblCellMar>' +
           '</w:tblPr><w:tblGrid>' + grid + '</w:tblGrid>' + body + '</w:tbl>';
  }

  // A section heading in plain text is conventionally written in capitals
  // ("3. COOKIES"). A line such as "Last updated: 10.08.2026" contains
  // lowercase letters and is therefore body text.
  // Counting letters via case folding keeps this alphabet-agnostic and avoids
  // Unicode property escapes, which older browsers do not support.
  function looksLikeHeading(line) {
    if (line.length > 90) return false;
    var letters = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch.toUpperCase() !== ch.toLowerCase()) letters++;
    }
    if (letters < 3) return false;
    return line === line.toUpperCase();
  }

  var LIST_MARKER = /^[—–•*-]\s+/;

  function looksLikeListItem(line) {
    return LIST_MARKER.test(line);
  }

  // Ordered lists are deliberately not detected here. Word renumbers list
  // items, so turning "5. Refunds" into a numbered item could silently
  // renumber it to 1 and change what a legal document says. Numbered lists
  // stay opt-in through the block API.
  function parse(text) {
    var blocks = [];
    var first = true;
    String(text).split('\n').forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;   // blank lines are separators; spacing comes from styles
      if (first) { blocks.push({ type: 'title', text: line }); first = false; return; }
      if (looksLikeHeading(line)) { blocks.push({ type: 'heading', text: line }); return; }
      if (looksLikeListItem(line)) {
        // Word draws the bullet itself, so the typed marker is dropped.
        blocks.push({ type: 'list', text: line.replace(LIST_MARKER, '') });
        return;
      }
      blocks.push({ type: 'body', text: line });
    });
    return blocks;
  }

  var MARGIN_LEFT = 1701, MARGIN_RIGHT = 850;

  function documentXml(blocks, opt, links, counters) {
    var page = PAGE_SIZES[String(opt.pageSize).toUpperCase()] || PAGE_SIZES.A4;
    var textWidth = page.w - MARGIN_LEFT - MARGIN_RIGHT;
    var orderedGroups = 0;
    var inOrdered = false;

    var body = blocks.map(function (block) {
      // A new numbered list starts wherever the previous block was not one.
      var ordered = block.type === 'list' && !!block.ordered;
      if (ordered && !inOrdered) orderedGroups++;
      inOrdered = ordered;

      if (block.type === 'pageBreak') return PAGE_BREAK;
      // Word expects a paragraph after a table; without it two adjacent
      // tables merge into one.
      if (block.type === 'table') {
        return tableXml(block, links, textWidth) +
               '<w:p><w:pPr><w:pStyle w:val="DocBody"/></w:pPr></w:p>';
      }
      return para(block, links, orderedGroups + 1);
    }).join('');

    counters.orderedGroups = orderedGroups;
    return DECL +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
      ' xmlns:r="' + REL_NS + '">' +
      '<w:body>' + body +
      '<w:sectPr><w:pgSz w:w="' + page.w + '" w:h="' + page.h + '"/>' +
      '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"' +
      ' w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>';
  }

  function options(user) {
    var opt = {};
    Object.keys(DEFAULTS).forEach(function (k) { opt[k] = DEFAULTS[k]; });
    if (user) {
      Object.keys(user).forEach(function (k) {
        if (user[k] !== undefined && user[k] !== null) opt[k] = user[k];
      });
    }
    return opt;
  }

  // Returns the seven OOXML parts. [Content_Types].xml must come first in the
  // archive, the rest may be in any order. The body is rendered before the
  // relationships part because hyperlinks are discovered while rendering.
  function parts(title, content, userOptions) {
    var opt = options(userOptions);
    var blocks = typeof content === 'string' ? parse(content) : (content || []);
    var links = [];
    var counters = { orderedGroups: 0 };
    var doc = documentXml(blocks, opt, links, counters);
    return [
      { name: '[Content_Types].xml', xml: CONTENT_TYPES },
      { name: '_rels/.rels', xml: ROOT_RELS },
      { name: 'docProps/core.xml', xml: core(title, opt) },
      { name: 'word/document.xml', xml: doc },
      { name: 'word/_rels/document.xml.rels', xml: docRels(links) },
      { name: 'word/styles.xml', xml: styles(opt) },
      { name: 'word/numbering.xml', xml: numbering(counters.orderedGroups) }
    ];
  }

  /** Build a .docx and return it as a Blob. */
  function build(title, content, userOptions) {
    var opt = options(userOptions);
    return new Blob(zipParts(parts(title, content, userOptions), opt.compress),
                    { type: MIME });
  }

  /** Build a .docx and return it as a Uint8Array (handy in Node). */
  function buildBytes(title, content, userOptions) {
    var chunks = zipParts(parts(title, content, userOptions),
                          options(userOptions).compress);
    var total = chunks.reduce(function (n, c) { return n + c.length; }, 0);
    var out = new Uint8Array(total);
    var at = 0;
    chunks.forEach(function (c) { out.set(c, at); at += c.length; });
    return out;
  }

  /** True when the runtime has everything the builder needs. */
  function supported() {
    return typeof TextEncoder !== 'undefined' && typeof Blob !== 'undefined' &&
           typeof Uint8Array !== 'undefined' && typeof DataView !== 'undefined';
  }

  return {
    build: build,
    buildBytes: buildBytes,
    parts: parts,
    parse: parse,
    supported: supported,
    mime: MIME,
    crc32: crc32
  };
});
