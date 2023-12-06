require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const net = require('net');

let IP = null;

async function updateDNSRecord (dnsInfo, ip) {
  try {
    const url = `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records/${dnsInfo.id}`;
    const { data } = await axios.put(url, {
      type: dnsInfo.type,
      name: dnsInfo.name,
      content: ip,
      ttl: dnsInfo.ttl,
      proxied: dnsInfo.proxied
    }, {
      headers: {
        'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
        'X-Auth-Key': process.env.CLOUDFLARE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return data;
  } catch (err) {
    console.log("Error while updating Cloudflare DNS Record: ", err.message);
    return null;
  }
};

async function updateDNSRecordsJob() {
  const domains = require('./domains.json');
  const ip = await getCurrentIP();
  if (!ip) {
    console.log("Error while getting my IP");
    return;
  } else {
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];
      const dnsInfo = await getDNSInfoByName(domain);
      if (dnsInfo) {
        if (dnsInfo.content !== ip) {
          console.log(`Update IP for domain ${domain} from ${dnsInfo.content} to ${ip}`);
          const result = await updateDNSRecord(dnsInfo, ip);
        } else {
          console.log(`Domain ${domain} is up to date`);
        }
      } else {
        console.log(`Domain ${domain} not found`);
      }
    }
  }
}

const getDNSInfoByName = async (domain) => {
  try {
    const url = `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records?name=${domain}`;
    const { data } = await axios.get(url, {
      headers: {
        'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
        'X-Auth-Key': process.env.CLOUDFLARE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return data.result[0];
  } catch (err) {
    console.log("Error while getting Cloudflare DNS Records: ", err.message);
    return null;
  }
}

const getCurrentIP = async () => {
  try {
    const url = 'http://checkip.amazonaws.com';
    const { data } = await axios.get(url);
    if (data && net.isIP(data.trim())) {
      return data.trim();
    } else {
      console.log("Error while getting my IP: ", data);
      return null;
    }
  } catch (err) {
    console.log("Error while getting my IP: ", err.message);
    return null;
  }
}
cron.schedule('* * * * *', async () => {
  /**********************************
  # ┌────────────── second (optional)
  # │ ┌──────────── minute
  # │ │ ┌────────── hour
  # │ │ │ ┌──────── day of month
  # │ │ │ │ ┌────── month
  # │ │ │ │ │ ┌──── day of week
  # │ │ │ │ │ │
  # │ │ │ │ │ │
  # * * * * * *
  **********************************/
 console.log(`===***=== Running a job at ${new Date().toISOString()} ===***===`)
  const ip = await getCurrentIP();
  console.log("My IP: ", ip);
  if (ip && IP !== ip) {
    console.log("My IP Changed: ", IP, " -> ", ip);
    IP = ip;
    updateDNSRecordsJob();
  } else {
    console.log("My IP Not Changed: ", IP);
  }
});
