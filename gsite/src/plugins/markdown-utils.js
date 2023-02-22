const markdownToHtml = function(link, data) {
  let preData = data;
  let subPath = link.substring(0, link.lastIndexOf('/') + 1);
  const pattern = /!\[(.*?)\]\((.*?)\)/mg;
  let matcher;
  while ((matcher = pattern.exec(data)) !== null) {
    if(matcher.length == 3) {
      let imageName = matcher[2];
      let imageUrl = subPath + imageName.substring(2);
      preData = preData.replace(imageName, imageUrl)
    }
  }
  let subtitles = []
  const renderer = new marked.Renderer()
  renderer.heading = function (text, level) {
    let encordText = encodeURI(text)
    encordText = encordText.replace("&amp;", "--")
    encordText = encordText.replace("/", "")
    encordText = encordText.replace("%20", "")
    let anchor = decodeURI(encordText)
    anchor = anchor.replace(" ", "")
    subtitles.push({
      value: text,
      depth: level,
      anchor: "#" + anchor
    })
    return `<h${level} id="${anchor}"><a href="#${anchor}" aria-hidden="true"><span class="icon icon-link"></span></a>${text}</h${level}>`
  }
  let content = marked.parse(preData, { renderer: renderer })
  return { content, subtitles }
}

export {markdownToHtml}