const { Client } = require('pg');
const c = new Client('postgresql://postgres:gcrUTwCjuFaxeMWrjngaWJbSORhAbrHY@shinkansen.proxy.rlwy.net:54075/railway');
c.connect()
  .then(() => c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); return c.end(); })
  .catch(e => { console.error(e.message); c.end(); });
