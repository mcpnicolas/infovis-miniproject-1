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

	// Convert to array
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

function groupbyPurpose(data) {
	let result = data.reduce((result, d) => {
		let currentPurpose = result[d.coalesced_purpose_name] || {
			"Purpose":d.coalesced_purpose_name,
			"Countries": {}
		}
		if (!currentPurpose.Countries[d.recipient]) {
			currentPurpose.Countries[d.recipient] = {
				"Name": d.recipient,
				"Amount": 0
			}
		}
		currentPurpose.Countries[d.recipient].Amount += parseInt(d.commitment_amount_usd_constant)
		result[d.coalesced_purpose_name] = currentPurpose
		return result
	},{})

	// Convert to array
	result = Object.keys(result).map(key => result[key])
	result.sort((a, b) => {
		return d3.descending(Object.keys(a.Countries).length,Object.keys(b.Countries).length)
	})
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

function getVis3ChartConfig() {
	let width = 825;
	let height = 500;
	let margin = {
		top: 150,
		bottom: 10,
		left: 100,
		right: 10
	}
	let bodyHeight = height - margin.top - margin.bottom
	let bodyWidth = width - margin.left - margin.right

	let container = d3.select("#Vis3Chart")
	
	container
		.attr("width", width)
		.attr("height", height)

	return { width, height, margin, bodyHeight, bodyWidth, container }
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

function getMinMaxTotal(countries) {
	let minMax = {
		"min": 0,
		"max": 0
	}
	for (c in countries) {
		let net = countries[c].AmountReceived+countries[c].AmountDonated
		if (net > minMax["max"]) minMax["max"] = net
		else if (net < minMax["min"]) minMax["min"] = net
	}
	return minMax
}

function getLinearScaleValueToArea(countries) {
	let minMaxTotal = getMinMaxTotal(countries)
	let maxCircleRadius = 50;
    let maxCircleArea = Math.PI * Math.pow(maxCircleRadius, 2);
    let circleAreaScale = d3.scaleLinear()
    	.domain([minMaxTotal["min"], minMaxTotal["max"]])
    	.range([5, maxCircleArea])
	
	return circleAreaScale;
}

function getColorFillScale(countries) {
	let minMax = getMinMaxNet(countries)
	let colorScale = d3.scaleSqrt()
		.domain([minMax["min"],0,minMax["max"]])
		.range(["#CB7569", "#eeeeee","#737E16"])
		.interpolate(d3.interpolateHcl)
	
	return colorScale
}

function getColorOutlineScale() {
	let colorScale = d3.scaleOrdinal()
		.domain([-1,1])
		.range(["#CB7569","#737E16"])
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
		.attr("fill", "#CB7569")
		.attr("opacity","0.9")

	bars.enter().append("rect")
		.attr("y", (d) => yScale(d.Country))
		//.attr("x", (bodyWidth/2)+margin.right)
		.attr("x", (d) => xScale(d.AmountDonated)+1)
		.attr("height", yScale.bandwidth())
		.attr("width", (d) => xScale(d.AmountReceived))
		.attr("fill", "#737E16")
		.attr("opacity","0.9")
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
		.attr("fill", "#CB7569")

	legend.append("circle")
		.attr("cx", xLegend+15)
		.attr("cy", yLegend+35)
		.attr("r", 5)
		.attr("fill", "#737E16")

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

function drawLegendVis2Chart(divergingColorScale, circleAreaScale, config, minNet, maxNet, minTotal, maxTotal) {
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

	linearGradient.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", divergingColorScale(minNet))

	linearGradient.append("stop")
		.attr("offset", "50%")
		.attr("stop-color", divergingColorScale(0))

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

	legend.append("text")
		.attr("x", xLegend+110)
		.attr("y", yLegend+185)
		.text("$" + ((0.01*maxTotal)/1000000000).toString().substring(0,1) + "B")

	legend.append("text")
		.attr("x", xLegend+103)
		.attr("y", yLegend+230)
		.text("$" + (maxTotal/1000000000).toString().substring(0,3) + "B")

	legend.append("text")
		.attr("x", xLegend+45)
		.attr("y", yLegend+80)
		.text("Total Amount Exchanged")

	legend.append("text")
		.attr("x", xLegend+63)
		.attr("y", yLegend+95)
		.text("(Received + Donated)")

	legend.append("circle")
		.attr("class","legend-circle-max")
		.attr("cx", xLegend+120)
		.attr("cy", yLegend+165)
		.attr("r", function() {
			let area = circleAreaScale(maxTotal)
			return Math.sqrt(area / Math.PI)
		})
		.attr("fill", "transparent")
		.attr("stroke", "#9b9b9b")

	legend.append("circle")
		.attr("class","legend-circle-min")
		.attr("cx", xLegend+120)
		.attr("cy", yLegend+165)
		.attr("r", function() { 
			let area = circleAreaScale(0.01*maxTotal)
			return Math.sqrt(area / Math.PI)
		})
		.attr("fill", "transparent")
		.attr("stroke", "#9b9b9b")
		
}

function drawVis2Chart(countries, geo) {
	let config = getVis2ChartConfig()
	let container = config.container
	let projection = getMapProjection(config)
	let path = d3.geoPath().projection(projection)
	let colorFillScale = getColorFillScale(countries)
	let colorOutlineScale = getColorOutlineScale()
	let circleScale = getLinearScaleValueToArea(countries)

	let minMaxNet = getMinMaxNet(countries)
	let minMaxTotal = getMinMaxTotal(countries)
	drawLegendVis2Chart(colorFillScale, circleScale, config, minMaxNet["min"], minMaxNet["max"], minMaxTotal["min"], minMaxTotal["max"])
	
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
	//console.log(centroids)
	
	container.selectAll("path").data(geo.features)
		.enter().append("path")
		.attr("d", d => path(d))
		.attr("stroke", "transparent")
		.attr("fill", "#eee")

	container.selectAll(".centroid")
		.data(centroids)
		.enter()
		.append("circle")
		.attr("class","centroid")
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
		var distribution = container.selectAll('.centroid').data(centroids)
	
		distribution.enter()
			.append('circle')
			.attr('r', function(d) {
				return d.radius
			})
			.merge(distribution)
			.attr('cx', function(d) {
				return d.x
			})
			.attr('cy', function(d) {
				return d.y
			})
			
		distribution.exit().remove()
	}

	setTimeout(function() {
		container.selectAll('.centroid').data(centroids).select(".centroid").data(centroids)
			.enter()
			.append("text")
			.attr("class","centroid-label")
			.attr("font-size","4")
			.attr("fill","#ffffff")
			.text(function(d) {
				if (Math.sqrt(circleScale(d[2]) / Math.PI) > 20) {
					return d[0]
				}
				let empty = ""
				return empty
			})
			.attr("x",function(d) {
				let thisWidth = d3.select(this).node().getComputedTextLength()
				if (thisWidth > 2*(Math.sqrt(circleScale(d[2]) / Math.PI))) return d.x - 0.25*thisWidth
				return (d.x - thisWidth/2)
			})
			.attr("y",function(d) {
				return (d.y)
			})
	}, (2 * 1000))
}

function wrap(text, width) {
  text.each(function() {
    let text = d3.select(this),
        words = text.text().split(" ").reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1, // ems
        y = text.attr("y"),
				 //dy = parseFloat(text.attr("dy")),
				dy = 0,
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
				line = [word];
				if (lineNumber == 1) {
					tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", lineNumber * lineHeight + dy + "em").text(word);
				}
				else {
					tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
				}
      }
    }
  });
}

function drawAxesVis3Chart(purposes, countriesList, xScale, yScale, config) {
	let { container, margin, height } = config;
	
	let axisX = d3.axisTop(xScale)
	container.append("g")
		.style("transform", `translate(${margin.left}px,${margin.top-5}px)`)
		.call(axisX)
		.attr("class", "axis-top")
		.selectAll("text")
		.attr("transform", `rotate(-90)`)
		.attr("dy", "1.25em")
    .style("text-anchor", "start")
	
	let axisY = d3.axisLeft(yScale)
	container.append("g")
		.style("transform", `translate(${margin.left-5}px,${margin.top}px)`)
		.call(axisY)
		.attr("class", "axis-left")
		.selectAll(".tick text")
    .call(wrap, margin.left-5)
}

function drawLegendVis3Chart(colorScale, config) {
	let {container, margin, height, width} = config;
	let xLegend = 0;
	let yLegend = 15;

	let legend = container.append("g")
		.attr("class", "legend")

	legend.append("text")
		.attr("x", xLegend)
		.attr("y", yLegend+12)
		.text("Percent of total donations to country")

	legend.append("text")
		.attr("x", xLegend)
		.attr("y", yLegend+50)
		.text("0%")

	legend.append("rect")
		.attr("x", xLegend)
		.attr("y", yLegend+20)
		.attr("height", 15)
		.attr("width", 40)
		.attr("fill", "#CDC094")

	legend.append("rect")
		.attr("x", xLegend+40)
		.attr("y", yLegend+20)
		.attr("height", 15)
		.attr("width", 40)
		.attr("fill", "#A4A063")

	legend.append("text")
		.attr("x", xLegend+35)
		.attr("y", yLegend+50)
		.text("1%")

	legend.append("rect")
		.attr("x", xLegend+80)
		.attr("y", yLegend+20)
		.attr("height", 15)
		.attr("width", 40)
		.attr("fill", "#737E16")

	legend.append("text")
		.attr("x", xLegend+75)
		.attr("y", yLegend+50)
		.text("10%")
	
	legend.append("rect")
		.attr("x", xLegend+120)
		.attr("y", yLegend+20)
		.attr("height", 15)
		.attr("width", 40)
		.attr("fill", "#595F18")

	legend.append("text")
		.attr("x", xLegend+115)
		.attr("y", yLegend+50)
		.text("25%")

	legend.append("rect")
		.attr("x", xLegend+160)
		.attr("y", yLegend+20)
		.attr("height", 15)
		.attr("width", 40)
		.attr("fill", "#384100")

	legend.append("text")
		.attr("x", xLegend+155)
		.attr("y", yLegend+50)
		.text("50%")

	legend.append("text")
		.attr("x", xLegend+190)
		.attr("y", yLegend+50)
		.text(">50%")
}

function drawVis3Chart(purposes, countriesMap, countriesList)	{
	let config = getVis3ChartConfig()
	
	for (p in purposes) {
		for (c in purposes[p].Countries) {
			// adding total received amount to country
			purposes[p].Countries[c].TotalReceived = countriesMap[purposes[p].Countries[c].Name].AmountReceived
		}
	}
	let sortedReceivedCountries = countriesList.sort((a, b) => {
		// sorting all countries by received descending
		return d3.descending(a.AmountReceived, b.AmountReceived)
	})

	let colorScale = d3.scaleThreshold()
    .domain([0.01, 0.1, 0.25, 0.5])
		.range(["#CDC094","#A4A063","#737E16","#595F18","#384100"])

	let rows = purposes.length // one for each purpose
	let cols = sortedReceivedCountries.length // one for each country

	let matrix = new Array(rows)
	for (var i = 0; i < rows; i++) {
  	matrix[i] = new Array(cols)
  	for (var j = 0; j < cols; j++) {
			let countryPurposeAmt
			let countryTotalAmt
			// if country has not received any money for this purpose
			if (!purposes[i].Countries[sortedReceivedCountries[j].Country]) ratio = 0
			else { // calculate ratio of this amount to all donations received
				countryPurposeAmt = purposes[i].Countries[sortedReceivedCountries[j].Country].Amount
				countryTotalAmt = purposes[i].Countries[sortedReceivedCountries[j].Country].TotalReceived
				ratio = countryPurposeAmt/countryTotalAmt
				console.log(ratio)
			}
			matrix[i][j] = colorScale(ratio)
  	}
	}

	let x = d3.scaleBand()
    .domain(d3.range(cols))
		.range([0, config.bodyWidth])
	
	let xScale = d3.scaleBand()
    .domain(sortedReceivedCountries.map(c => c.Country))
    .range([0, config.bodyWidth])

	let y = d3.scaleBand()
		.domain(d3.range(rows))
		.range([0, config.bodyHeight])

	let yScale = d3.scaleBand()
		.domain(purposes.map(p => p.Purpose))
		.range([0, config.bodyHeight])

	let body = config.container.append("g")
		.style("transform", `translate(${config.margin.left}px,${config.margin.top}px)`)

	let row = body.selectAll(".row")
    .data(matrix)
		.enter().append("g")
    .attr("class", "row")
    .attr("transform", function(d, i) { return "translate(0," + y(i) + ")" })

	row.selectAll(".cell")
    .data(function(d) { return d })
		.enter()
		.append("rect")
    .attr("class", "cell")
    .attr("x", function(d, i) { return x(i) })
    .attr("width", x.bandwidth())
		.attr("height", y.bandwidth())
		.style("stroke","#ffffff")
		.style("stroke-width", 1)
		.style("fill",function(d) { return d })
	
	row.append("text")
    .attr("x", -config.margin.left)
    .attr("y", y.bandwidth() / 2)
    .attr("text-anchor", "end")
		.text(function(d, i) { return i; });

		drawAxesVis3Chart(purposes, sortedReceivedCountries, xScale, yScale, config)
		drawLegendVis3Chart(colorScale,config)
}

function showData() {
	let aiddata = store.aiddata
	let geo = store.geoJSON
	let countriesList = groupByCountryArray(aiddata)
	let countriesMap = groupByCountryMap(aiddata)
	let purposes = groupbyPurpose(aiddata)
	let topPurposes = purposes.slice(0,5)
	console.log(countriesMap)
	console.log(topPurposes)
	drawVis1Chart(countriesList)
	drawVis2Chart(countriesMap, geo)
	drawVis3Chart(topPurposes, countriesMap, countriesList)	
}

loadData().then(showData);