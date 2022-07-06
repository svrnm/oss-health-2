import fs from 'fs';
import * as dotenv from 'dotenv';
import { getMembersFromGithubOrg, getMembersFromGithubTeam } from './github.mjs'
import { getDeveloperActivityCountsByCompanies, getDevStatUsersJson } from './devStats.mjs'

dotenv.config()
const auth = process.env.GITHUB_AUTH_TOKEN;

async function fromCacheOrGet(name, callback) {
    const file = './.cache/' + name + '.json'
    if(fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file).toString())
    } else {
        const result = await callback();
        fs.writeFileSync(file, JSON.stringify(result))
        return result
    }
}

function mergeArrays(a, b) {
    return [...new Set([...a ,...b])]; 
}

const devStatUsers = await fromCacheOrGet('gitdmMembers', () => getDevStatUsersJson())
const ghMembers = await fromCacheOrGet('ghMembers', () => getMembersFromGithubTeam(auth))
const ossMembers = await fromCacheOrGet('ossMembers', () => getMembersFromGithubOrg(auth))
const developerContributions = await fromCacheOrGet('developerContributions', () => getDeveloperActivityCountsByCompanies('contributions'))
const developerPRs = await fromCacheOrGet('developerPRs', () => getDeveloperActivityCountsByCompanies('prs'))




const userNames = mergeArrays(Object.keys(ghMembers), Object.keys(developerContributions).filter(key => ['Cisco', 'Dashbase'].includes(developerContributions[key].company)))

console.log(userNames)

const users = userNames.map(username => {
    // console.log(ghMembers[username], ossMembers.includes(username), developerContributions[username])

    const ghProfile = ghMembers[username]
    const isOssMember = ossMembers.includes(username)
    const gitDmProfile = devStatUsers[username]
    const devProfile = developerContributions[username] ? developerContributions[username] : { rank: false, value: 0 }

    return [
        username,
        ghProfile ? ghProfile.company : '',
        ghProfile ? ghProfile.location : '',
        ghProfile ? ghProfile.email : '',
        ghProfile ? ghProfile.orgs.includes('cisco-open') : false,
        ghProfile ? ghProfile.orgs.includes('open-telemetry') : false,
        isOssMember,
        devProfile.rank,
        devProfile.value,
        gitDmProfile ? gitDmProfile.affiliation.includes('Cisco') : false,
        gitDmProfile ? gitDmProfile.affiliation : 'undefined'
    ]
})

const usersCsv = [['username','company','location','email','cisco-open','open-telemetry','public','rank','value','affiliated','affiliations']].concat(users)


console.log(usersCsv)
fs.writeFileSync('result.csv', usersCsv.map(row => row.join(';')).join('\n'))
