import { Builder, By, until } from 'selenium-webdriver';

async function processURL(url: string): Promise<string> {
  let driver = await new Builder().forBrowser('chrome').build();
  try {
    await driver.get(url);
    const content = await driver.findElement(By.tagName('body')).getText();
    return content;
  } finally {
    await driver.quit();
  }
}

export default processURL;