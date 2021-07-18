const randomUseragent = require("random-useragent");
const cheerio = require("cheerio");
const axios = require("axios");
const { MongoClient } = require("mongodb");
// i hope this is the correct URL
var url = process.env.ATLAS_URI;

// TESTING
// getMongodbURL("AMD", "Ryzen 5 3600").then((res) => console.log(res));
/* scrapeUBM("https://gpu.userbenchmark.com/Nvidia-RTX-2080-Ti/Rating/4027").then(
  (res) => console.log(res)
); */

// EXAMPLE USE
//getFps("Intel", "Core i5-7600K").then((res) => console.log(res));

async function getFps(itemBrand, itemName) {
  // search mongodb for item and get URL
  const URL = await getMongodbURL(itemBrand, itemName);
  // scrape the URL for fps
  return await scrapeUBM(URL);
}

async function scrapeUBM(URL) {
  // function to parse string obtained from scraping UBM
  function trimResMid(str) {
    return str
      .split(":")
      .map((x) => x.trim())
      .join(": ");
  }

  function arrDataToJSON(arr) {
    if (arr === undefined || arr.length == 0) {
      // if no fps data
      return {};
    } else {
      const newArr = arr.map((e) =>
        e.substring(e.lastIndexOf(":") + 1, e.lastIndexOf(" EFps")).trim()
      );
      return {
        Avg: newArr[0],
        CSGO: newArr[1],
        GTAV: newArr[2],
        Overwatch: newArr[3],
        PUBG: newArr[4],
        Fortnite: newArr[5],
      };
    }
  }
  try {
    if (URL === "") {
      return {};
    }
    const { data } = await axios.get(URL, {
      headers: { "User-Agent": randomUseragent.getRandom() },
    });
    const $ = cheerio.load(data);
    var fpsArr = [];

    const eFps = $(
      "body > div.container-fluid.pagebounds.pagecontainer > div > div:nth-child(2) > div.row.hovertarget > div.col-xs-4.col-collapsible > div:nth-child(2) > div"
    );

    eFps
      .find("a > span.productgrid-cap.blacktext.mhelipsis")
      .each(function (index, element) {
        fpsArr.push(trimResMid($(element).text()));
      });

    return arrDataToJSON(fpsArr);
  } catch (error) {
    console.error(error);
  }
}

async function getMongodbURL(itemBrand, itemName) {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  try {
    await client.connect();
    // define a database and collection on which to run the method
    const database = client.db("ubmDatabase");
    const col = database.collection("cpuData");
    // specify an optional query document
    /* const query = {
      Brand: { $regex: itemBrand.toUpperCase() },
      Model: { $regex: itemName.toUpperCase() },
    }; */
    const query = {
      Brand: itemBrand.toUpperCase(),
      Model: itemName.toUpperCase(),
    };
    // const res = await col.findOne({ Brand: itemBrand, Model: itemName });
    const res = await col.findOne(query);

    // if no product found in mongodb, return empty string
    if (res == null) {
      return "";
    } else {
      return res.URL;
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

module.exports.ubmScrapper = getFps;