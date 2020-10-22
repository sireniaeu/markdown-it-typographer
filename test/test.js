'use strict'

var expect = require('chai').expect

describe('markdown-it-typographer', function () {
  it('should render dashes', function () {
    var s, target
    var md = require('markdown-it')('commonmark').use(require('..'))

    s = '--'
    target = '<p>\u2013</p>\n'
    expect(md.render(s)).to.equal(target)

    s = 'I am a ---'
    target = '<p>I am a \u2014</p>\n'
    expect(md.render(s)).to.equal(target)
  })
  it('should render curly quotation marks', function () {
    var s, target
    var md = require('markdown-it')('commonmark').use(require('..'))

    s = 'hello "friend"'
    target = '<p>hello “friend”</p>\n'
    expect(md.render(s)).to.equal(target)
  })
})
