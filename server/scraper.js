require("dotenv").config();
const puppeteer = require("puppeteer");

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
    await page.goto(scrapingList[i], {
      waitUntil: "networkidle0"
    });

    // for testing only, print out any console.log from page.evaluate
    // page.on('console', msg => {
    // for (let i = 0; i < msg._args.length; ++i)
    //   console.log(`${i}: ${msg._args[i]}`);
    // });

    const resultsFromOneGroup = await page.evaluate(() => {
      let results = [];
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

        let linkToOriginalPost = event.children[0].children[0].children[0].getAttribute("href");
        let image = event.children[0].children[0].children[0].children[0].style.backgroundImage.replace("url(\"", "").replace("\")", "");
        let dateTime = event.children[0].children[1].children[0].children[0].children[0].innerText;
        let title = event.children[0].children[1].children[0].children[1].children[0].children[0].children[0].children[0].innerText;
        let organization = event.children[0].children[1].children[1].children[1].children[0];
        organizationLink = organization.children[0].getAttribute("href");
        organizationName = organization.children[0].children[0].innerText;

        singleEvent = { title, image, dateTime, organizationName, organizationLink, linkToOriginalPost };

        results.push(singleEvent);
      } // End for loop for current group event list
      return results;
    }) // End page.evaluate
    scrapingResults = scrapingResults.concat(resultsFromOneGroup);
  } // End for loop for scrapingList
  return scrapingResults;
}

// export functions
module.exports = { scrapEvents };
