
import { Octokit } from 'octokit';
import { throttling } from '@octokit/plugin-throttling';

const ThrottledOctokit = Octokit.plugin(throttling);

let octokit = false

function getOctokit (auth) {
    if(!octokit) {
        octokit = new ThrottledOctokit({
            auth,
            log: console,
            throttle: {
                onRateLimit: (retryAfter, options, octokit) => {
                    logger.warn(
                        `Request quota exhausted for request ${options.method} ${options.url}`
                    );

                    if (options.request.retryCount === 0) {
                        // only retries once
                        logger.info(`Retrying after ${retryAfter} seconds!`);
                        return true;
                    }
                },
                onAbuseLimit: (retryAfter, options, octokit) => {
                    // does not retry, only logs a warning
                    logger.warn(
                        `Abuse detected for request ${options.method} ${options.url}`
                    );
                },
            }
        });
    }
    return octokit
}

async function getMembersFromGithubOrg(auth, org = 'open-telemetry') {
    const octokit = getOctokit(auth)

    const users = []
    
    const iterator = octokit.paginate.iterator(octokit.rest.orgs.listMembers, {
        org,
        per_page: 100
      });
    for await (const { data } of iterator) {
        for (let i = 0; i < data.length; i += 1) {
            const username = data[i].login
            users.push(username)
        }
    }
    
    return users
}

async function getMembersFromGithubTeam(auth, org = 'cisco-open', team = 'OpenTelemetry') {
    const octokit = getOctokit(auth)

    const users = {
    
    }
    
    const iterator = octokit.paginate.iterator(octokit.rest.teams.listMembersInOrg, {
        org,
        team_slug: team,
        per_page: 100,
    });
    for await (const { data } of iterator) {
        for (let i = 0; i < data.length; i += 1) {
            const username = data[i].login
            const profile = await octokit.rest.users.getByUsername({
                username
            });
            const usersOrgs = await octokit.rest.orgs.listForUser({ 
                username
            });
            users[username] = {
                username,
                company: profile.data.company,
                location: profile.data.location,
                email: profile.data.email,
                orgs: usersOrgs.data.map(org => org.login)
            }
        }
    }
    
    return users
}


export { getMembersFromGithubTeam, getMembersFromGithubOrg }