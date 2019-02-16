const request = require('request');
const cheerio = require('cheerio');
const UrlParser = require('url-parse');
const fs = require('fs');
const stemmer = require('stemmer');

const INDEX_FILE_PATH = './app/resources/index.txt';
const SITE_DATA_DIRECTORY_PATH = './app/resources/site-data';
const LINKS_TO_VISIT = [];
let count = 0;
let maxCoveredSites;

function startCrawl(url, maxSitesCount) {
  maxCoveredSites = maxSitesCount;
  addPushListener(LINKS_TO_VISIT, crawl);
  LINKS_TO_VISIT.push(url);
}

function crawl(url) {
  request(url, (error, response, body) => {
    if (error) {
      console.log('Response error: ' + error);
    } else {
      // will be replaced
      const currentCount = ++count;
      const $body = cheerio.load(body);
      const parsedUrl = new UrlParser(url);
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
      console.log(currentCount + ': ' + response.request.uri.href);
      createFileWithSiteBody(currentCount, $body.text());
      appendIndexFile(currentCount, response.request.uri.href);
      addLinksToVisitList($body, baseUrl);
    }
  });
}

function addLinksToVisitList($body, baseUrl) {
  $body('a').each((index, value) => {
    if (LINKS_TO_VISIT.length >= maxCoveredSites) {
      // exit loop
      return false;
    }
    const href = $body(value).attr('href');
    if (href) {
      if (href.startsWith('http')) {
        if (href.startsWith(`${baseUrl}/`) && !LINKS_TO_VISIT.includes(href)) {
          LINKS_TO_VISIT.push(href);
        }
      } else {
        const fullHref = `${baseUrl}/${href}`;
        if (!LINKS_TO_VISIT.includes(fullHref)) {
          LINKS_TO_VISIT.push(fullHref);
        }
      }
    }
  });
}

function addPushListener(array, callback) {
  array.push = function (url) {
    Array.prototype.push.call(array, url);
    callback(url);
  };
}

function createFileWithSiteBody(number, body) {
  const textBody = body.replace(/\s{2,}/g, ' ').replace(/[.,!?]/g, '');
  let stemmedBody;
  textBody.split(' ').forEach(word => stemmedBody += stemmer(word) + ' ');
  fs.writeFile(`${SITE_DATA_DIRECTORY_PATH}/${number}.txt`, stemmedBody, (error) => {
    if (error) {
      throw error;
    }
  });
}

function appendIndexFile(number, href) {
  fs.appendFile(INDEX_FILE_PATH, number + ': ' + href + '\n', (error) => {
    if (error) {
      throw error;
    }
  });
}

module.exports.startCrawl = startCrawl;