// This code sample uses the 'node-fetch' library:
// https://www.npmjs.com/package/node-fetch
import fetch from 'node-fetch';

function logMemory(){
    const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;

    const memoryData = process.memoryUsage();

    const memoryUsage = {
    rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
    //heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
    //heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
    //external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
    };

    console.log(memoryUsage);
}

console.log(1);
logMemory();
fetch('https://abrega-dev.atlassian.net/rest/api/3/attachment/content/10638', {
  method: 'GET',
  headers: {
    'Authorization': `Basic ${Buffer.from(
      'boris@abrega.com:ATATT3xFfGF0aCjoN0ZC-669C63TpSUj2RzTwthyGWDhzJvWAz7Kn69aGGgpNmFqDpu1HaKU5pPY5X2FoszZqlPLN2_ddDgYDaTKICKUCyw4jVKr4Oxwilq6UBed-z9JpETs2-hjS2aYDH7EbKvIWX71zLeU3vSe2j0fi72c0icm1s6C3PCdnY0=57502F9B'
    ).toString('base64')}`,
    'Accept': 'application/json'
  }
})
  .then(response => {
    console.log(
      `Response: ${response.status} ${response.statusText}`
    );
    return response.text();
  })
  .then(text => {
    console.log(2);
    logMemory();
  })
  .catch(err => console.error(err));

