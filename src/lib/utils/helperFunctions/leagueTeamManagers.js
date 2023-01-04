import { leagueID } from '$lib/utils/leagueInfo';
import { get } from 'svelte/store';
import { teamManagersStore } from '$lib/stores';
import { waitForAll } from './multiPromise';
import { getManagers, getTeamData } from './universalFunctions';
import { getLeagueData } from './leagueData';

export const getLeagueTeamManagers = async () => {
    if(get(teamManagersStore) && Object.keys(get(teamManagersStore)).length > 0) {
		return get(teamManagersStore);
	}
    let currentLeagueID = leagueID;
	let teamManagersMap = {};

    // loop through all seasons and create a [year][roster_id]: team, managers object
	while(currentLeagueID && currentLeagueID != 0) {
		const [usersRaw, leagueData, rostersRaw] = await waitForAll(
            fetch(`https://api.sleeper.app/v1/league/${currentLeagueID}/users`, {compress: true}),
			getLeagueData(currentLeagueID),
            fetch(`https://api.sleeper.app/v1/league/${currentLeagueID}/rosters`, {compress: true}),
        ).catch((err) => { console.error(err); });

        const [users, rosters] = await waitForAll(
            usersRaw.json(), 
            rostersRaw.json(), 
        ).catch((err) => { console.error(err); });

        const year = parseInt(leagueData.season);
        if(!teamManagersMap.currentSeason) {
            teamManagersMap.currentSeason = year;
        }

        currentLeagueID = leagueData.previous_league_id;
        teamManagersMap[year] = {};
        const processedUsers = processUsers(users);
        for(const roster of rosters) {
            teamManagersMap[year][roster.roster_id] = {
                team: getTeamData(processedUsers, roster.owner_id),
                managers: getManagers(roster, processedUsers),
            };
        }
    }
    teamManagersStore.update(() => teamManagersMap);
    return teamManagersMap;
}

const processUsers = (rawUsers) => {
	let finalUsers = {};
	for(const user of rawUsers) {
		finalUsers[user.user_id] = user;
	}
	return finalUsers;
}