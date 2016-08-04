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

  var extract = (files, post) => {
    var date = moment(post.time)
    var filename = `${filePrefix}-${date.format('YYYY-MM-DD')}.md`
    if (!files[filename]) {
      files[filename] = [
        `title: ${titlePrefix} ${date.format('MMM Do YYYY')}`,
        `date: ${date.format('YYYY-MM-DD')}`,
        'categories:']
      files[filename] = files[filename]
        .concat(categories.map(c => `- ${c}`))
      files[filename].push('---')
      files[filename].push('')
    }
    var file = files[filename]
    file.push(`## [${post.description}](${post.href})`)
    file.push(post.extended)
    file.push('')
    return files
  }

  var format = files => {
    return R.keys(files).map(filename => {
      return {
        filename,
        content: files[filename].join('\n')
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

