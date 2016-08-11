var rp = require('request-promise'),
    R = require('ramda'),
    moment = require('moment'),
    fs = require('fs')

function pinboard(args) {
  var config = this.config.pinboard;
  if (!config) {
    console.log('Cannot find pinboard settings in _config.yml')
    return
  }
  var token = config.token || process.env.PINBOARD_TOKEN
  var options = {
    uri: 'https://api.pinboard.in/v1/posts/all',
    qs: {
      auth_token: token,
      tag: config.tag,
      format: 'json'
    },
    json: true
  }
  var filePrefix = config.prefix || 'around-the-web'
  var titlePrefix = config.prefix || 'Around the Web'
  var categories = config.categories || ['around the web']
  var layout = config.layout || 'post'

  var processTags = R.pipe(R.split(' '), R.without(config.tag))

  var extract = (files, post) => {
    var date = moment(post.time)
    var filename = `${filePrefix}-${date.format('YYYY')}-${date.week()}.md`
    if (!files[filename]) {
      files[filename] = {
        filename,
        layout,
        date,
        tags: processTags(post.tags),
        content: []
      }
    }
    if (date > files[filename].date) files[filename].date = date
    var content = files[filename].content
    content.push(`## [${post.description}](${post.href})`)
    content.push(post.extended)
    content.push('')
    return files
  }

  var format = files => {
    return R.values(files).map(file => {
      var lines = [
        `layout: ${file.layout}`,
        `title: ${titlePrefix} for ${file.date.format('MMMM D, YYYY')}`,
        `date: ${file.date.format('YYYY-MM-DD')}`,
        `categories:`
      ]
      lines = lines.concat(categories.map(c => `- ${c}`))
      lines.push('tags:')
      lines = lines.concat(file.tags.map(t => `- ${t}`))
      lines.push('---\n')
      lines = lines.concat(file.content)
      return {
        filename: file.filename,
        content: lines.join('\n')
      }
    })
  }

  var fn = R.pipe(R.reduce(extract, {}), format)
  rp(options)
    .then(posts => {
      var files = fn(posts)
      files.map(file => {
        fs.writeFile(`source/_posts/${file.filename}`,
                     file.content, err => {
                       console.log(`${file.filename} generated.`)
                     })
      })
    }).catch(console.log)
}

hexo.extend.console.register('pinboard', 'Around the Web', pinboard)

