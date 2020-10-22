'use strict'

/*
 * Mostly copied from:
 *
 * - https://github.com/markdown-it/markdown-it/blob/cc8714584282209853fd14e3e0dfb20dfd9c289b/lib/rules_core/replacements.js
 * - https://github.com/adam-p/markdown-it-smartarrows/blob/master/index.js
 *
*/

// Simple typographic replacements
//
// '' → ‘’
// "" → “”. Set '«»' for Russian, '„“' for German, empty to disable
// (c) (C) → ©
// (tm) (TM) → ™
// (r) (R) → ®
// +- → ±
// (p) (P) -> §
// ... → … (also ?.... → ?.., !.... → !..)
// ???????? → ???, !!!!! → !!!, `,,` → `,`
// -- → &ndash;, --- → &mdash;
//

// TODO:
// - fractionals 1/2, 1/4, 3/4 -> ½, ¼, ¾
// - miltiplication 2 x 4 -> 2 × 4

// Convert straight quotation marks to typographic ones
//

function isWhiteSpace (code) {
  if (code >= 0x2000 && code <= 0x200A) { return true }
  switch (code) {
    case 0x09: // \t
    case 0x0A: // \n
    case 0x0B: // \v
    case 0x0C: // \f
    case 0x0D: // \r
    case 0x20:
    case 0xA0:
    case 0x1680:
    case 0x202F:
    case 0x205F:
    case 0x3000:
      return true
  }
  return false
}

var UNICODE_PUNCT_RE = require('uc.micro/categories/P/regex')

// Currently without astral characters support.
function isPunctChar (ch) {
  return UNICODE_PUNCT_RE.test(ch)
}

function isMdAsciiPunct (ch) {
  switch (ch) {
    case 0x21/* ! */:
    case 0x22/* " */:
    case 0x23/* # */:
    case 0x24/* $ */:
    case 0x25/* % */:
    case 0x26/* & */:
    case 0x27/* ' */:
    case 0x28/* ( */:
    case 0x29/* ) */:
    case 0x2A/* * */:
    case 0x2B/* + */:
    case 0x2C/* , */:
    case 0x2D/* - */:
    case 0x2E/* . */:
    case 0x2F/* / */:
    case 0x3A/* : */:
    case 0x3B/* ; */:
    case 0x3C/* < */:
    case 0x3D/* = */:
    case 0x3E/* > */:
    case 0x3F/* ? */:
    case 0x40/* @ */:
    case 0x5B/* [ */:
    case 0x5C/* \ */:
    case 0x5D/* ] */:
    case 0x5E/* ^ */:
    case 0x5F/* _ */:
    case 0x60/* ` */:
    case 0x7B/* { */:
    case 0x7C/* | */:
    case 0x7D/* } */:
    case 0x7E/* ~ */:
      return true
    default:
      return false
  }
}

var QUOTE_TEST_RE = /['"]/
var QUOTE_RE = /['"]/g
var APOSTROPHE = '\u2019' /* ’ */

function replaceAt (str, index, ch) {
  return str.substr(0, index) + ch + str.substr(index + 1)
}

function ProcessInlines (tokens, state) {
  var i, token, text, t, pos, max, thisLevel, item, lastChar, nextChar,
    isLastPunctChar, isNextPunctChar, isLastWhiteSpace, isNextWhiteSpace,
    canOpen, canClose, j, isSingle, stack, openQuote, closeQuote

  stack = []

  for (i = 0; i < tokens.length; i++) {
    token = tokens[i]

    thisLevel = tokens[i].level

    for (j = stack.length - 1; j >= 0; j--) {
      if (stack[j].level <= thisLevel) { break }
    }
    stack.length = j + 1

    if (token.type !== 'text') { continue }

    text = token.content
    pos = 0
    max = text.length

    /* eslint no-labels:0,block-scoped-var:0 */
    OUTER:
    while (pos < max) {
      QUOTE_RE.lastIndex = pos
      t = QUOTE_RE.exec(text)
      if (!t) { break }

      canOpen = canClose = true
      pos = t.index + 1
      isSingle = (t[0] === "'")

      // Find previous character,
      // default to space if it's the beginning of the line
      //
      lastChar = 0x20

      if (t.index - 1 >= 0) {
        lastChar = text.charCodeAt(t.index - 1)
      } else {
        for (j = i - 1; j >= 0; j--) {
          if (tokens[j].type === 'softbreak' || tokens[j].type === 'hardbreak') break // lastChar defaults to 0x20
          if (!tokens[j].content) continue // should skip all tokens except 'text', 'html_inline' or 'code_inline'

          lastChar = tokens[j].content.charCodeAt(tokens[j].content.length - 1)
          break
        }
      }

      // Find next character,
      // default to space if it's the end of the line
      //
      nextChar = 0x20

      if (pos < max) {
        nextChar = text.charCodeAt(pos)
      } else {
        for (j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === 'softbreak' || tokens[j].type === 'hardbreak') break // nextChar defaults to 0x20
          if (!tokens[j].content) continue // should skip all tokens except 'text', 'html_inline' or 'code_inline'

          nextChar = tokens[j].content.charCodeAt(0)
          break
        }
      }

      isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctChar(String.fromCharCode(lastChar))
      isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctChar(String.fromCharCode(nextChar))

      isLastWhiteSpace = isWhiteSpace(lastChar)
      isNextWhiteSpace = isWhiteSpace(nextChar)

      if (isNextWhiteSpace) {
        canOpen = false
      } else if (isNextPunctChar) {
        if (!(isLastWhiteSpace || isLastPunctChar)) {
          canOpen = false
        }
      }

      if (isLastWhiteSpace) {
        canClose = false
      } else if (isLastPunctChar) {
        if (!(isNextWhiteSpace || isNextPunctChar)) {
          canClose = false
        }
      }

      if (nextChar === 0x22 /* " */ && t[0] === '"') {
        if (lastChar >= 0x30 /* 0 */ && lastChar <= 0x39 /* 9 */) {
          // special case: 1"" - count first quote as an inch
          canClose = canOpen = false
        }
      }

      if (canOpen && canClose) {
        // Replace quotes in the middle of punctuation sequence, but not
        // in the middle of the words, i.e.:
        //
        // 1. foo " bar " baz - not replaced
        // 2. foo-"-bar-"-baz - replaced
        // 3. foo"bar"baz     - not replaced
        //
        canOpen = isLastPunctChar
        canClose = isNextPunctChar
      }

      if (!canOpen && !canClose) {
        // middle of word
        if (isSingle) {
          token.content = replaceAt(token.content, t.index, APOSTROPHE)
        }
        continue
      }

      if (canClose) {
        // this could be a closing quote, rewind the stack to get a match
        for (j = stack.length - 1; j >= 0; j--) {
          item = stack[j]
          if (stack[j].level < thisLevel) { break }
          if (item.single === isSingle && stack[j].level === thisLevel) {
            item = stack[j]

            if (isSingle) {
              openQuote = state.md.options.quotes[2]
              closeQuote = state.md.options.quotes[3]
            } else {
              openQuote = state.md.options.quotes[0]
              closeQuote = state.md.options.quotes[1]
            }

            // replace token.content *before* tokens[item.token].content,
            // because, if they are pointing at the same token, replaceAt
            // could mess up indices when quote length != 1
            token.content = replaceAt(token.content, t.index, closeQuote)
            tokens[item.token].content = replaceAt(
              tokens[item.token].content, item.pos, openQuote)

            pos += closeQuote.length - 1
            if (item.token === i) { pos += openQuote.length - 1 }

            text = token.content
            max = text.length

            stack.length = j
            continue OUTER
          }
        }
      }

      if (canOpen) {
        stack.push({
          token: i,
          pos: t.index,
          single: isSingle,
          level: thisLevel
        })
      } else if (canClose && isSingle) {
        token.content = replaceAt(token.content, t.index, APOSTROPHE)
      }
    }
  }
}

var RARE_RE = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/

// Workaround for phantomjs - need regex without /g flag,
// or root check will fail every second time
var SCOPED_ABBR_TEST_RE = /\((c|tm|r|p)\)/i

var SCOPED_ABBR_RE = /\((c|tm|r|p)\)/ig
var SCOPED_ABBR = {
  c: '©',
  r: '®',
  p: '§',
  tm: '™'
}

function replaceFn (match, name) {
  return SCOPED_ABBR[name.toLowerCase()]
}

function ReplaceScoped (inlineTokens) {
  var i, token

  for (i = inlineTokens.length - 1; i >= 0; i--) {
    token = inlineTokens[i]
    if (token.type === 'text') {
      token.content = token.content.replace(SCOPED_ABBR_RE, replaceFn)
    }
  }
}

function ReplaceRare (inlineTokens) {
  var i, token

  for (i = inlineTokens.length - 1; i >= 0; i--) {
    token = inlineTokens[i]
    if (token.type === 'text') {
      if (RARE_RE.test(token.content)) {
        token.content = token.content
          .replace(/\+-/g, '±')
          // .., ..., ....... -> …
          // but ?..... & !..... -> ?.. & !..
          .replace(/\.{2,}/g, '…').replace(/([?!])…/g, '$1..')
          .replace(/([?!]){4,}/g, '$1$1$1').replace(/,{2,}/g, ',')
          // em-dash
          .replace(/(^|[^-])---([^-]|$)/mg, '$1\u2014$2')
          // en-dash
          .replace(/(^|\s)--(\s|$)/mg, '$1\u2013$2')
          .replace(/(^|[^-\s])--([^-\s]|$)/mg, '$1\u2013$2')
      }
    }
  }
}

function typographer (state) {
  for (var blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
    if (state.tokens[blkIdx].type !== 'inline') { continue }

    if (QUOTE_TEST_RE.test(state.tokens[blkIdx].content)) {
      ProcessInlines(state.tokens[blkIdx].children, state)
    }

    if (SCOPED_ABBR_TEST_RE.test(state.tokens[blkIdx].content)) {
      ReplaceScoped(state.tokens[blkIdx].children)
    }

    if (RARE_RE.test(state.tokens[blkIdx].content)) {
      ReplaceRare(state.tokens[blkIdx].children)
    }
  }
};

module.exports = function TypographerPlugin (md, scheme) {
  // After the built-in m-dash and n-dash support
  md.core.ruler.before('smartquotes', 'typographer', typographer)
}
