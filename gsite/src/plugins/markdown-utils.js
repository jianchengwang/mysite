const markdownToHtml = function(link, data) {
  let preData = data;
  let subPath = link.substr(0, link.lastIndexOf('/') + 1);
  const pattern = /!\[(.*?)\]\((.*?)\)/mg;
  let matcher;
  while ((matcher = pattern.exec(data)) !== null) {
    if(matcher.length == 3) {
      let imageName = matcher[2];
      let imageUrl = subPath + imageName.substring(2);
      preData = preData.replace(imageName, imageUrl)
    }
  }
  return marked.parse(preData)
}

const subTitles = function(data) {
  const pattern = /!##/mg;
  let matcher;
  while ((matcher = pattern.exec(data)) !== null) {
    console.info(matcher)
  }
}

export {markdownToHtml}