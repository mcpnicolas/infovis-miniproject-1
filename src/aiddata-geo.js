let store = {}

function loadData() {
	return Promise.all([
		d3.csv("aiddata-countries-only.csv"),
		d3.json("countries.geo.json")
	]).then(datasets => {
		store.aiddata = datasets[0]
		store.geoJSON = datasets[1]
		console.log("Loaded dataset")
		return store;
	})
}

function groupByCountryArray(data) {
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
	result.sort((a, b) => {
		return d3.descending(a.AmountDonated-a.AmountReceived, b.AmountDonated-b.AmountReceived)
		//return d3.ascending(a.Country, b.Country)
	})
  	return result
}

function groupByCountryMap(data) {
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

  	return result
}

function getVis1ChartConfig() {
	let width = 730;
	let height = 500;
	let margin = {
		top: 20,
		bottom: 10,
		left: 110,
		right: 10
	}
	let bodyHeight = height - margin.top - margin.bottom
	let bodyWidth = width - margin.left - margin.right

	let container = d3.select("#Vis1Chart")
	
	container
		.attr("width", width)
		.attr("height", height)

	return { width, height, margin, bodyHeight, bodyWidth, container }
}

function getVis2ChartConfig() {
	let width = 750;
	let height = 450;
	let margin = {
		top: 20,
		bottom: 20,
		left: 10,
		right: 10
	}
	let bodyHeight = height - margin.top - margin.bottom
	let bodyWidth = width - margin.left - margin.right

	let container = d3.select("#Vis2Chart")
	
	container
		.attr("width", width)
		.attr("height", height)

	return { width, height, margin, bodyHeight, bodyWidth, container }
}

function getMapProjection(config) {
	let { width, height } = config;
	let projection = d3.geoMercator()
	projection.scale(100).translate([width / 2, height / 2+85])
				
	store.mapProjection = projection;
	return projection;
}

function getVis1ChartScales(countries, config) {
	let { bodyWidth, bodyHeight } = config;
	let maxAmount = Math.max(d3.max(countries, c => c.AmountDonated),d3.max(countries, c => c.AmountReceived))
	
	let yScale = d3.scaleBand()
		.domain(countries.map(c => c.Country))
		.range([0,bodyHeight])
		.padding(0.15)

	let xScale = d3.scaleLinear()
		.domain([0, maxAmount])
		.range([0, bodyWidth])

	return { xScale, yScale }
}

function getLinearScaleValueToArea(centroids) {
	let maxValue = 0;
	for (circle in centroids) {
		if (centroids[circle][2] > maxValue) maxValue = centroids[circle][2]
	}
	let maxCircleRadius = 50;
    let maxCircleArea = Math.PI * Math.pow(maxCircleRadius, 2);
    let circleAreaScale = d3.scaleLinear()
    	.domain([0, maxValue])
    	.range([10, maxCircleArea])
	
	return circleAreaScale;
}

function getMinMaxNet(countries) {

	let minMax = {
		"min": 0,
		"max": 0
	}

	for (c in countries) {
		let net = countries[c].AmountReceived-countries[c].AmountDonated
		if (net > minMax["max"]) minMax["max"] = net
		else if (net < minMax["min"]) minMax["min"] = net
	}

	return minMax
}

function getColorFillScale(countries) {
	let minMax = getMinMaxNet(countries)
	let colorScale = d3.scaleSqrt()
		.domain([minMax["min"],0,minMax["max"]])
	  	.range(["#DB6549", "#f2f2f2","#045431"]);
	  
	return colorScale
}

function getColorOutlineScale() {
	let colorScale = d3.scaleOrdinal()
		.domain([-1,1])
		.range(["#DB6549","#045431"])
	return colorScale
}

function drawBarsVis1Chart(countries, scales, config) {
	let { margin, container, bodyWidth } = config
	let { xScale, yScale } = scales

	let body = container.append("g")
	.style("transform", `translate(${margin.left}px,${margin.top}px)`)

	let bars = body.selectAll(".bar").data(countries)

	bars.enter().append("rect")
		.attr("y", (d) => yScale(d.Country))
		.attr("x", 1)
		.attr("height", yScale.bandwidth())
		.attr("width", (d) => xScale(d.AmountDonated))
		.attr("fill", "#DB6549")

	bars.enter().append("rect")
		.attr("y", (d) => yScale(d.Country))
		//.attr("x", (bodyWidth/2)+margin.right)
		.attr("x", (d) => xScale(d.AmountDonated)+1)
		.attr("height", yScale.bandwidth())
		.attr("width", (d) => xScale(d.AmountReceived))
		.attr("fill", "#045431")
}

function drawAxesVis1Chart(countries, scales, config) {
	let { xScale, yScale } = scales
	let { container, margin, height } = config;
	
	let axisX = d3.axisTop(xScale).ticks(10).tickSize(-(height-margin.bottom-margin.top)).tickFormat(d => "$" + d/1000000000 + "B")
	container.append("g")
		.style("transform", `translate(${margin.left}px,${margin.top}px)`)
		.call(axisX)
		.attr("class", "axis-top")

	let axisY = d3.axisLeft(yScale)
	container.append("g")
		.style("transform", `translate(${margin.left}px,${margin.top}px)`)
		.call(axisY)
		.attr("class", "axis-left")
}

function drawLegendVis1Chart(countries, scales, config) {
	let {container, margin, height, width} = config;
	let xLegend = width-150;
	let yLegend = height-70;

	let legend = container.append("g")
		.attr("class", "legend")
		
	legend.append("rect")
		.attr("x", xLegend)
		.attr("y", yLegend)
		.attr("height", 50)
		.attr("width", 125)
		.attr("fill", "#ffffff")

	legend.append("circle")
		.attr("cx", xLegend+15)
		.attr("cy", yLegend+15)
		.attr("r", 5)
		.attr("fill", "#DB6549")

	legend.append("circle")
		.attr("cx", xLegend+15)
		.attr("cy", yLegend+35)
		.attr("r", 5)
		.attr("fill", "#045431")

	legend.append("text")
		.attr("x", xLegend+25)
		.attr("y", yLegend+20)
		.text("Amount Donated")

	legend.append("text")
		.attr("x", xLegend+25)
		.attr("y", yLegend+40)
		.text("Amount Received")
}

function drawVis1Chart(countries) {
	let config = getVis1ChartConfig()
	let scales = getVis1ChartScales(countries, config)
	drawAxesVis1Chart(countries, scales, config)
	drawBarsVis1Chart(countries, scales, config)
	drawLegendVis1Chart(countries, scales, config)
}

function drawLegendVis2Chart(divergingColorScale, config, minNet, maxNet) {
	let {container, margin, height, width} = config;
	let xLegend = width - 100;
	let yLegend = 0;

	let legend = container.append("g")
		.attr("class", "legend")
		
	legend.append("rect")
		.attr("x", xLegend)
		.attr("y", yLegend+20)
		.attr("height", 15)
		.attr("width", 180)
		.style("fill", "url(#linear-gradient)")

	legend.append("text")
		.attr("x", xLegend)
		.attr("y", yLegend+12)
		.text("Net Amount (Received - Donated)")
	
	var defs = legend.append("defs")
	var linearGradient = defs.append("linearGradient")
		.attr("id", "linear-gradient")
		.attr("x1", "0%")
		.attr("y1", "0%")
		.attr("x2", "100%")
		.attr("y2", "0%");

	//Set the color for the start (0%)
	linearGradient.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", divergingColorScale(minNet))

	linearGradient.append("stop")
		.attr("offset", "50%")
		.attr("stop-color", divergingColorScale(0))

	//Set the color for the end (100%)
	linearGradient.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", divergingColorScale(maxNet))
	
		
	legend.append("text")
		.attr("x", xLegend)
		.attr("y", yLegend+50)
		.text("$" + (minNet/1000000000).toString().substring(0,4) + "B")

	legend.append("text")
		.attr("x", xLegend+145)
		.attr("y", yLegend+50)
		.text("$" + (maxNet/1000000000).toString().substring(0,3) + "B")
		
}

function drawVis2Chart(countries, geo) {
	let config = getVis2ChartConfig()
	let container = config.container
	let projection = getMapProjection(config)
	let path = d3.geoPath().projection(projection)
	let colorFillScale = getColorFillScale(countries)
	let colorOutlineScale = getColorOutlineScale()

	let minMax = getMinMaxNet(countries)
	drawLegendVis2Chart(colorFillScale, config, minMax["min"], minMax["max"])
	
	let centroids = []

	// Exceptions:
	// United States of America == United States
	// Slovakia == Slovak Republic
	// South Korea == Korea
	// Monaco
	// Lichtenstein
	let exceptions = [
		["United States of America","United States"],
		["Slovakia","Slovak Republic"],
		["South Korea","Korea"]
	]

	for (geoCountry in geo.features) {
		for (aidCountry in countries) {
			if (geo.features[geoCountry].properties.name == countries[aidCountry].Country) {
				centroids.push([
					countries[aidCountry].Country,
					path.centroid(geo.features[geoCountry]),
					countries[aidCountry].AmountDonated+countries[aidCountry].AmountReceived,
					countries[aidCountry].AmountReceived-countries[aidCountry].AmountDonated
				])

				if (geo.features[geoCountry].properties.name == "Switzerland") {
					centroids.push([
						"Liechtenstein",
						path.centroid(geo.features[geoCountry]),
						countries["Liechtenstein"].AmountDonated+countries["Liechtenstein"].AmountReceived,
						countries["Liechtenstein"].AmountReceived-countries["Liechtenstein"].AmountDonated
					])
				}
				else if (geo.features[geoCountry].properties.name == "Italy") {
					centroids.push([
						"Monaco",
						path.centroid(geo.features[geoCountry]),
						countries["Monaco"].AmountDonated+countries["Monaco"].AmountReceived,
						countries["Monaco"].AmountReceived-countries["Monaco"].AmountDonated
					])
				}
			}
			else {
				for (let i = 0; i < exceptions.length; i++) {
					if (geo.features[geoCountry].properties.name == exceptions[i][0]) {
						centroids.push([
							exceptions[i][1],
							path.centroid(geo.features[geoCountry]),
							countries[exceptions[i][1]].AmountDonated+countries[exceptions[i][1]].AmountReceived,
							countries[exceptions[i][1]].AmountReceived-countries[exceptions[i][1]].AmountDonated
						])
						exceptions.splice(i, 1)
					}
				}
			}
		}
	}
	console.log(centroids)
	let circleScale = getLinearScaleValueToArea(centroids)
	
	container.selectAll("path").data(geo.features)
		.enter().append("path")
		.attr("d", d => path(d))
		.attr("stroke", "transparent")
		.attr("fill", "#eee")

	container.selectAll("circle")
		.data(centroids)
		.enter()
		.append("circle")
		.attr("r", function(d) { 
			let area = circleScale(d[2])
			return Math.sqrt(area / Math.PI)
		})
		.attr("fill", (d) => colorFillScale(d[3]))
		.attr("stroke", function(d) {
			if (d[3] < 0) return colorOutlineScale(-1)
			else return colorOutlineScale(1)
		})
		.attr("cx", (d) => d[1][0])
		.attr("cy", (d) => d[1][1])

	let simulation = d3.forceSimulation(centroids)
		.force('charge', d3.forceManyBody().strength(-7))
		.force('collision', d3.forceCollide().radius(function(d) {
			let area = circleScale(d[2])
			return Math.sqrt(area / Math.PI)
		}))
		.force('x', d3.forceX().x(function(d) {
			return d[1][0]
		  }))
		.force('y', d3.forceY().y(function(d) {
			return d[1][1]
		  }))
		.on('tick', ticked)
	  
	function ticked() {
		var distribution = container.selectAll('circle').data(centroids)
	
		distribution.enter()
			.append('circle')
			.attr('r', function(d) {
				return d.radius
			})
			.merge(distribution).attr('cx', function(d) {
				return d.x
			})
			.attr('cy', function(d) {
				return d.y
			})
		
		distribution.exit().remove()
	}
}

function showData() {
	let aiddata = store.aiddata
	let geo = store.geoJSON
	let countriesList = groupByCountryArray(aiddata)
	let countriesMap = groupByCountryMap(aiddata)
	console.log(countriesList)
	drawVis1Chart(countriesList)
	drawVis2Chart(countriesMap, geo)
}

loadData().then(showData);