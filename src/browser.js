import UAParser from 'ua-parser-js';

export class Browser {
    constructor() {
        this.browser = new UAParser();
    }

    isChrome() {
        const browserName = this.browser.getBrowser().name;
        console.log('browserName', browserName );
        return browserName === 'Chrome';
    }
}
