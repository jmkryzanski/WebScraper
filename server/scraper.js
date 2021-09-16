require("dotenv").config();
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

let scrapingList = [
  "https://www.facebook.com/groups/444744689463060/events",
  "https://www.facebook.com/groups/recoveryfriends717/events",
  "https://www.facebook.com/groups/292737672143068/events",
  // "https://www.facebook.com/gloriousrecovery/events",
];

let scrapEvents = async () => {
  console.log("running scapEvents function");

  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  // Login
  await loginFacebook(page);

  // Scrapping
  let scrapingResults = await scrapeFacebookEvents(page);

  // close browser
  await browser.close();

  console.log("completed scapEvents function");
  return scrapingResults;
};

async function loginFacebook(page) {
  // Go to the login page
  await page.goto("https://www.facebook.com/login/", {
    waitUntil: "networkidle0",
  });
  // username and password
  await page.type("#email", process.env.EMAIL, { delay: 30 });
  await page.type("#pass", process.env.PASSWORD, { delay: 30 });
  await page.click("#loginbutton");

  // Wait for navigation to finish
  await page.waitForNavigation({ waitUntil: "networkidle0" });
}

async function scrapeFacebookEvents(page) {
  let singleEvent;
  let scrapingResults = [];

  // Scrape facebook groups one by one from scrapingList
  for (let i = 0; i < scrapingList.length; i++) {
    await page.goto(scrapingList[i]);

    const html = await page.content();
    const $ = cheerio.load(html);

    let UpcomingEventsDiv = $(".dati1w0a.ihqw7lf3.hv4rvrfc.discj3wi").eq(0);
    let numberOfEvents = $(UpcomingEventsDiv).children().length;

    // scrape events one by one from current group event list.
    for (let j = 1; j < numberOfEvents; j++) {
      // loop starts from 1 because first element of div is title => "Upcoming Events" text container
      let event;
      // The sturcture of Facebook events pages are slightly different, This if statement helps build more consistency.
      if ($(UpcomingEventsDiv).children().eq(j).length < 2) {
        event = $(UpcomingEventsDiv).children().eq(j).children().eq(0);
      } else {
        event = $(UpcomingEventsDiv).children().eq(j);
      }

      let linkToOriginalPost = $(event).children().eq(0).children().eq(0).attr("href");
      let image = $(event).children().eq(0).children().eq(0).children().eq(0).css("background-image").replace("url(", "").replace(")", "");
      let dateTime = $(event).children().eq(1).children().eq(0).children().eq(0).children().eq(0).text();
      let title = $(event).children().eq(1).children().eq(0).children().eq(1).children().eq(0).children().eq(0).children().eq(0).children().eq(0).text();
      let organization = $(event).children().eq(1).children().eq(1).children().eq(1).children().eq(0);
      organizationLink = $(organization).children().eq(0).attr("href");
      organizationName = $(organization).children().eq(0).children().eq(0).text();

      singleEvent = { title, image, dateTime, organizationName, organizationLink, linkToOriginalPost };

      scrapingResults.push(singleEvent);
    } // End for loop for current group event list
  } // End for loop for scrapingList
  return scrapingResults;
}

// export functions
module.exports = { scrapEvents };
