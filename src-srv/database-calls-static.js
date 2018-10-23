let databaseCalls = class DatabaseCalls {
	constructor() {
		this.SAMPLE_STATE = {
			players: [
				{
					id: '4Pw6B9km4f4CQExEegoHbV',
					name: 'Harry',
					gender: 'M',
				},
				{
					id: '5lT2dJlhWyIOlHpfiREBfJ',
					name: 'Ron',
					gender: 'M',
				},
				{
					id: '4ZjPjdvRQSFlePddQQh8OY',
					name: 'Hermione',
					gender: 'F',
				},
				{
					id: '2UHSaa0yi7guOwUQN5QLPc',
					name: 'Gina',
					gender: 'F',
				},
				{
					id: '79AlfdDaHZqtZbpYtlxOVW',
					name: 'Carlos',
					gender: 'M',
				},
				{
					id: '24OsdgKV7ePGkCgKNTSnH4',
					name: 'Jewels',
					gender: 'F',
				},
			],
			teams: [
				{
					id: 'm0jlfuEH5jouU8AOMIpbj',
					name: 'Big Guns',
					games: [
						{
							id: '4N3286ykcHFlIjRu8XBV0I',
							opponent: 'Bad Guys',
							lineup: ['4Pw6B9km4f4CQExEegoHbV', '5lT2dJlhWyIOlHpfiREBfJ', '4ZjPjdvRQSFlePddQQh8OY'],
							date: 1537043229736,
							park: 'Stazio',
							scoreUs: 0,
							scoreThem: 0,
							lineupType: 2,
							plateAppearances: [
								{
									id: 'iLTIJLlVIK7eqMusZ9flF',
									player_id: '4Pw6B9km4f4CQExEegoHbV',
								},
								{
									id: '1sF3SZe4hkl5b2Aa59lkJw',
									player_id: '5lT2dJlhWyIOlHpfiREBfJ',
									location: {
										x: 0.061764705882352944,
										y: 0.09705882352941177,
									},
								},
								{
									id: '7d5P2oCYztlFhCnQ79KTyV',
									player_id: '4ZjPjdvRQSFlePddQQh8OY',
									result: '2B',
									location: {
										x: 0.5941176470588235,
										y: 0.19411764705882353,
									},
								},
								{
									id: 'AaDeTuL6Uh2ZbOePr2inJ',
									player_id: '4Pw6B9km4f4CQExEegoHbV',
									location: {
										x: 0.3735294117647059,
										y: 0.3558823529411765,
									},
									result: 'Out',
								},
								{
									id: '79s6CZsXIMkyWloxw2cMqL',
									player_id: '5lT2dJlhWyIOlHpfiREBfJ',
									location: {
										x: 0.7794117647058824,
										y: 0.37058823529411766,
									},
									result: 'SAC',
								},
								{
									id: '2HEpXfz1e0fF3EKZVAqktS',
									player_id: '4ZjPjdvRQSFlePddQQh8OY',
									location: {
										x: 0.6264705882352941,
										y: 0.5941176470588235,
									},
									result: 'E',
								},
							],
						},
						{
							id: '1IY5Re4tLJu8hnXrGUPtIk',
							opponent: 'Bad Guys 2',
							lineup: ['4Pw6B9km4f4CQExEegoHbV', '5lT2dJlhWyIOlHpfiREBfJ', '4ZjPjdvRQSFlePddQQh8OY'],
							date: 1537043304062,
							park: 'Stazio',
							scoreUs: 0,
							scoreThem: 0,
							lineupType: 2,
							plateAppearances: [
								{
									id: '6rHVeLbRgEhlxCjaM3VSUh',
									player_id: '4Pw6B9km4f4CQExEegoHbV',
									location: {
										x: 0.5,
										y: 0.3588235294117647,
									},
									result: 'Out',
								},
								{
									id: '3T9c2S02cGgpbT2BIAykck',
									player_id: '5lT2dJlhWyIOlHpfiREBfJ',
									location: {
										x: 0.6235294117647059,
										y: 0.5764705882352941,
									},
									result: '2B',
								},
								{
									id: '3hUQoRy6tHN7dirqjZvrXQ',
									player_id: '4ZjPjdvRQSFlePddQQh8OY',
									location: {
										x: 0.2323529411764706,
										y: 0.6264705882352941,
									},
									result: '1B',
								},
							],
						},
					],
				},
				{
					id: '5nOdStkL6W78nKNVldoDZ4',
					name: 'Just for fun',
					games: [],
				},
				{
					id: '2gEtoAScefKFOTF7Wn4WIa',
					name: 'Pizza Team',
					games: [
						{
							id: '3ZRIY5ktchHxL4AhHvS5El',
							opponent: 'Pizza Game',
							lineup: ['2UHSaa0yi7guOwUQN5QLPc', '79AlfdDaHZqtZbpYtlxOVW', '24OsdgKV7ePGkCgKNTSnH4'],
							date: 1537043341908,
							park: 'Stazio',
							scoreUs: 0,
							scoreThem: 0,
							lineupType: 1,
							plateAppearances: [
								{
									id: '3JaE2TG0EFAKJaKkpvUGwv',
									player_id: '2UHSaa0yi7guOwUQN5QLPc',
									location: {
										x: 0.5617647058823529,
										y: 0.5235294117647059,
									},
									result: '1B',
								},
								{
									id: '2BrYyihBcyIffY8qsCpNr9',
									player_id: '79AlfdDaHZqtZbpYtlxOVW',
									location: {
										x: 0.6558823529411765,
										y: 0.22647058823529412,
									},
									result: '2B',
								},
								{
									id: '2qHIiZ5k5UvsHLN0x3MQIG',
									player_id: '24OsdgKV7ePGkCgKNTSnH4',
									location: {
										x: 0.11470588235294117,
										y: 0.4147058823529412,
									},
									result: '3B',
								},
								{
									id: '78bJCHG71VNCsBleBuQJCy',
									player_id: '2UHSaa0yi7guOwUQN5QLPc',
									location: {
										x: 0.27647058823529413,
										y: 0.5441176470588235,
									},
									result: 'Out',
								},
								{
									id: '5N2XhQFFhLBFbOLR3Ri7xC',
									player_id: '79AlfdDaHZqtZbpYtlxOVW',
									location: {
										x: 0.09411764705882353,
										y: 0.07941176470588235,
									},
									result: 'HRo',
								},
								{
									id: '1haY9oDOLncOGowVfcNET3',
									player_id: '24OsdgKV7ePGkCgKNTSnH4',
									location: {
										x: 0.3029411764705882,
										y: 0.31176470588235294,
									},
									result: '1B',
								},
							],
						},
						{
							id: '2XRVs58sTM6UuAFJsfQukP',
							opponent: 'Another Game',
							lineup: [],
							date: 1537043350381,
							park: 'Stazio',
							scoreUs: 0,
							scoreThem: 0,
							lineupType: 2,
							plateAppearances: [],
						},
					],
				},
			],
		};
	}

	// Login with any user name and the password "pizza"
	async getAccountFromEmail(email) {
		return { id: 1, password_hash: '$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2' };
	}

	getState(account_id) {
		return this.SAMPLE_STATE;
	}

	async setState(data) {
		let result = await getStatePromise();
		var ancestorDiffs = objectMerge.diff(this.SAMPLE_STATE, JSON.parse(data.ancestor));
		if (Object.keys(ancestorDiffs).length === 0 && ancestorDiffs.constructor === Object) {
			// Diff the client's data with the db data to get the patch we need to apply to make the database match the client
			var patch = objectMerge.diff(result, JSON.parse(data.local));
			objectMerge.patch(this.SAMPLE_STATE, patch);
		} else {
			responseObject.status = 'FAIL';
			responseObject.reason = 'PENDING CHANGES - PULL FIRST';
			res.send(JSON.stringify(responseObject));
		}
	}
};

// Node only
module.exports = databaseCalls;
