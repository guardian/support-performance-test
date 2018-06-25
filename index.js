const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Q = require('q');

const opts = {
    chromeFlags: ['--show-paint-rects', '--headless'],
    onlyCategories: ['Performance']
};
const numberOfTestsToRun = 100;
const csvWriter = createCsvWriter({
    path: 'results.csv',
    header: [
        { id: 'fmp', title: 'first-meaningful-paint' },
        { id: 'sim', title: 'speed-index-metric' },
        { id: 'ci', title: 'consistently-interactive' },
    ]
});

function launchChromeAndRunLighthouse(url, opts, config = null) {
    return chromeLauncher.launch({ chromeFlags: opts.chromeFlags }).then(chrome => {
        opts.port = chrome.port;
        return lighthouse(url, opts, config).then(results => {
            // use results.lhr for the JS-consumeable output
            // https://github.com/GoogleChrome/lighthouse/blob/master/typings/lhr.d.ts
            // use results.report for the HTML/JSON/CSV output as a string
            // use results.artifacts for the trace/screenshots/other specific case you need (rarer)
            return chrome.kill().then(() => results)
        });
    });
}

function runOneTest(i) {
    console.log(`Starting request ${i}`)
    return launchChromeAndRunLighthouse('https://support.code.dev-theguardian.com/uk', opts)
        .then(results => {
            const perf = results.reportCategories.find(cat => cat.name === 'Performance').audits;
            const fmp = perf.find(a => a.id === 'first-meaningful-paint').result.rawValue;
            const sim = perf.find(a => a.id === 'speed-index-metric').result.rawValue;
            const ci = perf.find(a => a.id === 'consistently-interactive').result.rawValue;
            console.log(`Request ${i} results: ${fmp}   ${sim}  ${ci}`);
            csvWriter.writeRecords([{ fmp: fmp, sim: sim, ci: ci }])
            .then(() => {
                if(i < numberOfTestsToRun){
                    runOneTest(i + 1);
                }
            });
        });
}

runOneTest(1);

