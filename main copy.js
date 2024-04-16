import { chromium } from 'playwright';

(async () => {

    const googleMapsURL = "https://www.google.com/maps/search/gym/@44.3267641,-84.7358592,12.73z/data=!4m2!2m1!6e1";

    // Launch browser
    console.time("Execution Time");
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enter URL
    await page.goto(googleMapsURL);
    await page.waitForSelector('[jstcache="3"]');

    let urls = [];

    // Scroll within the specific element identified by XPath
    while (true) {
        const pageContent = await page.content();
        if (pageContent.includes("You've reached the end of the list.")) {
            console.log("Reached the end of the list.");
            break;
        } else {
            await page.evaluate(() => {
                const scrollElement = document.evaluate('/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[1]/div[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                scrollElement.scrollTop += 500;
            });
        }
    }

    // Extract URLs
    urls = await page.evaluate(() => {
        let elements = Array.from(document.querySelectorAll('a[href*="https://www.google.com/maps/place"]'));
        return elements.map(element => element.href);
    });

    console.log(`Number of URLs extracted: ${urls.length}`);

    let data = [];
    const batchSize = 5; 

    // Pull info for each site
    for (let i = 0; i < urls.length; i += batchSize) {
        console.log(`Processing batch: ${i/batchSize + 1}/${Math.ceil(urls.length/batchSize)}`);
        const batchUrls = urls.slice(i, i + batchSize);
        const batchData = await Promise.all(batchUrls.map(async (url) => {
            const page = await context.newPage();
            await page.goto(url);
            await page.waitForSelector('[jstcache="3"]');
            
            // Selectors to pull the information
            const details = await page.evaluate(() => {

                // Function for text
                const getText = (selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.innerText : '';
                };

                // Function for href
                const getHref = (primarySelector, fallbackSelector) => {
                    let element = document.querySelector(primarySelector);
                    if (!element) {
                        element = document.querySelector(fallbackSelector);
                    }
                    return element && element.href ? element.href : '';
                };
            
                // Function for xpath
                const getTextFromXPath = (xpath) => {
                    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    return result.singleNodeValue ? result.singleNodeValue.innerText : '';
                };
            
                const companyName = getTextFromXPath('/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[1]/h1');
                const rating = getTextFromXPath('/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[1]/span[1]');
                let numberReviews = getTextFromXPath('/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[2]/span/span');
                numberReviews = numberReviews.replace(/\(|\)/g, '');
                const category = getTextFromXPath('/html/body/div[2]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[2]/span/span/button');
                
            
                return {
                    company: companyName,
                    rating: rating,
                    reviews: numberReviews,
                    category: category,
                    address: getText('button[data-tooltip="Copy address"]'),
                    website: getHref('a[data-tooltip="Open website"]', 'a[data-tooltip="Open menu link"]'),
                    phone: getText('button[data-tooltip="Copy phone number"]')
                };                             
            });

            await page.close();
            return { ...details, url };
        }));
        console.log(batchData)

    }
    console.timeEnd("Execution Time");
})();