import { default as axios } from 'axios';

async function getDevStatUsersJson() {
    const response = await axios.get('https://media.githubusercontent.com/media/cncf/devstats/master/github_users.json')

    return response.data.reduce((result, item) => {
        result[item.login] = item
        return result
    }, {})
}

async function getDeveloperActivityCountsByCompanies(metric = 'contributions', project = 'opentelemetry') {
    // hdev_contributionsallall, hdev_prsallall
    metric = `hdev_${metric}allall`
    const response = await axios.post(`https://${project}.devstats.cncf.io/api/ds/query`, {
        "queries": [
            {
                "refId": "A", "datasource": {
                    "uid": "P172949F98CB31475", "type": "postgres"
                }, 
                "rawSql": `select 
                sub."Rank",
                split_part(sub.name, '$$$', 1) as name,
                split_part(sub.name, '$$$', 2) as "Company",
                sub.value 
              from (
                select row_number() over (order by value desc) as "Rank",
                  name,
                  value
                from
                  shdev
                where
                  series = '${metric}' 
                  and period = 'y10'
                  and ('null' = 'null' or split_part(name, '$$$', 2) in (null))
              ) sub`,
                "format": "table", 
                "datasourceId": 1, 
                "intervalMs": 86400000, 
                "maxDataPoints": 1598
            }
        ]
    })

    if(response.status !== 200) {
        throw new Error('Could not get data from CNCF Devstats')
    }

    if(response.data && response.data.results && response.data.results.A && response.data.results.A.frames && response.data.results.A.frames[0] && response.data.results.A.frames[0].schema && response.data.results.A.frames[0].data) {
        const fields = response.data.results.A.frames[0].schema.fields.map(field => field.name.toLowerCase())
        const map = []
        response.data.results.A.frames[0].data.values.forEach( (column, fieldIndex) => {
            const field = fields[fieldIndex]
            column.forEach((entry, rowIndex) => {
                if(!map[rowIndex]) {
                    map[rowIndex] = {}
                }
                map[rowIndex][field] = entry
            })
        })
        return map.reduce((result, item) => {
            result[item.name] = item
            return result
        }, {})
    }
    throw new Error('Response in wrong format')
}

export { getDevStatUsersJson, getDeveloperActivityCountsByCompanies }