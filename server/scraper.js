require("dotenv").config();
const puppeteer = require("puppeteer");

let scrapingList = [
  "https://www.facebook.com/groups/444744689463060/events",
  // "https://www.facebook.com/groups/recoveryfriends717/events",
  // "https://www.facebook.com/groups/292737672143068/events",
  // "https://www.facebook.com/gloriousrecovery/events",
];

let scrapEvents = async () => {
  console.log("running scapEvents function");

  const browser = await puppeteer.launch({
    headless: false,
    // defaultViewport: null,
    // args: [
    //   "--incognito",
    //   "--no-sandbox",
    //   "--single-process",
    //   "--no-zygote"
    // ],
  });
  const page = await browser.newPage();

  // Login
  await loginFacebook(page);
  // Scrapping
  let scrapingResults = await scrapeFacebookEvents(browser, page);
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

async function scrapeFacebookEvents(browser, page) {
  let singleEvent;
  let scrapingResults = [];

  // Scrape facebook groups one by one from scrapingList
  for (let i = 0; i < scrapingList.length; i++) {
    await page.goto(scrapingList[i], {
      waitUntil: "networkidle0"
    });
    // Ineract with the page directly in the page DOM environment
    const basicInfosFromOneGroup = await page.evaluate(() => {
      let basicResults = [];
      const UpcomingEventsDiv = ".dati1w0a.ihqw7lf3.hv4rvrfc.discj3wi";
      let UpcomingEventsElement = document.querySelectorAll(UpcomingEventsDiv)[0];
      let numberOfEvents = UpcomingEventsElement.children.length;

      // scrape events one by one from current group event list.
      for (let j = 1; j < numberOfEvents; j++) {  
        // loop starts from 1 because first element of div is title => "Upcoming Events" text container
        let event;
        // The sturcture of Facebook events pages are slightly different, This if statement helps build more consistency.
        if (UpcomingEventsElement.children[j].length < 2) {
          event = UpcomingEventsElement.children[j].children[0];
        } else {
          event = UpcomingEventsElement.children[j]
        }
        // scrape data based on the structure of Facebook page.
        let linkToOriginalPost = event.children[0].children[0].children[0].getAttribute("href");
        let image = event.children[0].children[0].children[0].children[0].style.backgroundImage.replace("url(\"", "").replace("\")", "");
        let dateTime = event.children[0].children[1].children[0].children[0].children[0].innerText;
        let title = event.children[0].children[1].children[0].children[1].children[0].children[0].children[0].children[0].innerText;
        let organization = event.children[0].children[1].children[1].children[1].children[0];
        organizationLink = organization.children[0].getAttribute("href");
        organizationName = organization.children[0].children[0].innerText;
        
        singleEvent = { title, image, dateTime, organizationName, organizationLink, linkToOriginalPost };

        basicResults.push(singleEvent);
      } // End for loop for current group event list
      return basicResults;
    },) // End page.evaluate

    let resultsFromOneGroup = await scrapeIndividaulEvents(basicInfosFromOneGroup, browser);
    scrapingResults = scrapingResults.concat(resultsFromOneGroup);
  } // End for loop for scrapingList
  return scrapingResults;
}

// Scrape more information for events from a group.
async function scrapeIndividaulEvents(basicInfosFromOneGroup, browser) {
  let resultsFromOneGroup = [];
  // one by one for each event from current group.
  for (let i = 0; i < basicInfosFromOneGroup.length; i++) {
    // create new page and navigate to the original post of current event to scrape more information
    const pageForOriginalPost = await browser.newPage();
    await pageForOriginalPost.goto(basicInfosFromOneGroup[i].linkToOriginalPost, {
      waitUntil: "networkidle0"
    });
    
    // Scrape - ineract with the page directly in the page DOM environment
    const resultsFromOneEvent = await pageForOriginalPost.evaluate(async (pageForOriginalPost) => {
      const headingElement = document.querySelector(".k4urcfbm.nqmvxvec").children[0].children[0].children[0].children[0];
      let detailDateTime = headingElement.children[0].children[0].children[0].innerText;
      let address = headingElement.children[2].children[0].innerText;

      // description element - if some descriptions are hidden, scraper will click the "see more button" to expand the description
      const detailsElement = document.querySelectorAll(".discj3wi.ihqw7lf3 > .dwo3fsh8")[0].parentNode;
      let seeMoreBtn;
      if (detailsElement.lastChild.children[0].children[0].childNodes.length > 2) {
        seeMoreBtn = detailsElement.lastChild.children[0].children[0].children[0];
        await seeMoreBtn.click();
      }
      let description = detailsElement.lastChild.children[0].children[0].innerText;

      return { detailDateTime, address, description };
    });
    // Combine "basic" data from group page and "additional" data from original post of the event
    let basicInfoOfCurrEvent = basicInfosFromOneGroup[i];
    let moreInfoOfCurrEvent = { detailDateTime: resultsFromOneEvent.detailDateTime, address: resultsFromOneEvent.address, description: resultsFromOneEvent.description };
    let infoOfCurrEvent = {...basicInfoOfCurrEvent, ...moreInfoOfCurrEvent}
    resultsFromOneGroup.push(infoOfCurrEvent);
    await pageForOriginalPost.close();
  }
  return resultsFromOneGroup;
}

// export functions
module.exports = { scrapEvents };

// for testing only, print out any console.log from page.evaluate
// page.on('console', msg => {
// for (let i = 0; i < msg._args.length; ++i)
//   console.log(`${i}: ${msg._args[i]}`);
// });