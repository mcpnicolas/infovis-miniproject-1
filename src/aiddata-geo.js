let store = {}

function loadData() {
	return Promise.all([
		d3.csv("aiddata-countries-only.csv")
	]).then(datasets => {
		store.aiddata = datasets[0]
		console.log("Loaded dataset")
		return store;
	})
}

function groupByCountry(data) {
	// Iterate over each donation, producing a dictionary where countries are keys
	// and values are the USD amount donated to or received by the country

	let result = data.reduce((result, d) => {
		let currentDonor = result[d.donor] || {
			"Country": d.donor,
			"AmountDonated": 0,
			"AmountReceived": 0
		}
		currentDonor.AmountDonated += parseInt(d.commitment_amount_usd_constant)
		result[d.donor] = currentDonor

		let currentRecipient = result[d.recipient] || {
			"Country": d.recipient,
			"AmountDonated": 0,
			"AmountReceived": 0
		}
		currentRecipient.AmountReceived += parseInt(d.commitment_amount_usd_constant)
		result[d.recipient] = currentRecipient
	
	return result;
	},{})

	result = Object.keys(result).map(key => result[key])
  return result
}

function showData() {
	let aiddata = store.aiddata;
	let countries = groupByCountry(aiddata)
	console.log(countries)
}

loadData().then(showData);