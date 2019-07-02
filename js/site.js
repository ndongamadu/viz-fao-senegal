function hxlProxyToJSON(input){
    var output = [];
    var keys=[];
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0];
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att;
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}
var blue = '#007CE0';
var blueLight = '#72B0E0';
var green = '#06C0B4';
var femaleColor = '#EFA497';
var maleColor = '#F4C799';

function sortTotal(a, b){
    return a.value.total > b.value.total ? -1 : a.value.total < b.value.total ? 1 : 0 ;
}

function sortDelivery(a, b){
    return a.value.delivery > b.value.delivery ? -1 : a.value.delivery < b.value.delivery ? 1 : 0 ;
}

function generateCharts(geom, data) {
    var mapChart = dc.leafletChoroplethChart('#map');
    var indicChart = dc.rowChart('#os');
    var projectChart = dc.rowChart('#projects');
    var oddChart = dc.rowChart('#odd');

    var cf = crossfilter(data);

    var oddDim = cf.dimension(function(d){
        return d['#indicator+sdg'];
    });
    var mapDim = cf.dimension(function(d){
        return d['#adm1+code'];
    });
    var indicDim = cf.dimension(function(d){
        return d['#indicator+os'];
    });
    var projectDim = cf.dimension(function(d){
        return d['#project+name'];
    });
    var mapGroup = mapDim.group().reduceCount(function(d){
        return d['#project+name'];
    });
    var indicGroup = indicDim.group();
    var projectGroup = projectDim.group();
    var oddGroup = oddDim.group();

    var pGroup = projectDim.group().reduce(
        function(p,v){
            p.totalF += Number(v['#reached+f']);
            p.totalM += Number(v['#reached+m']);
            p.total += Number(v['#reached']);
            p.delivery += Number(v['#indicator+delivery']);
            return p;
        },
        function(p,v){
            p.totalF -= Number(v['#reached+f']);
            p.totalM -= Number(v['#reached+m']);
            p.total -= Number(v['#reached']);
            p.delivery -= Number(v['#indicator+delivery']);
            return p;
        },
        function(){
            return {
                totalF: 0,
                totalM: 0,
                total: 0,
                delivery: 0
            };
        }
    ).top(Infinity).sort(sortTotal);

    indicChart.width(400)
              .height(210)
              .dimension(indicDim)
              .group(indicGroup)
              .data(function(group){
                  return group.top(Infinity);
              })
              .colors(blueLight)
              .elasticX(true)
              .xAxis().ticks(5);

    oddChart.width(400)
              .height(210)
              .dimension(oddDim)
              .group(oddGroup)
              .data(function(group){
                  return group.top(Infinity);
              })
              .colors(blueLight)
              .elasticX(true)
              .xAxis().ticks(5);
    
    projectChart.width(400)
              .height(450)
              .dimension(projectDim)
              .group(projectGroup)
              .data(function(group){
                  return group.top(Infinity);
              })
              .colors(blueLight)
              .elasticX(true)
              .xAxis().ticks(5);

    mapChart.width($('#map').width())
            .height(400)
            .dimension(mapDim)
            .group(mapGroup)
            .center([0,0])
            .zoom(0)
            .geojson(geom)
            .colors([blue, blueLight,'#82B5E9'])
            .renderTitle(true)
            .label(function(p){ return p.key; })
            .colorDomain([0,2])
            .colorAccessor(function(d){
                var c ;
                d > 6 ? c = 0 :
                d > 3 ? c = 1 : c = 2;
                return c;
            })
            .featureKeyAccessor(function(feature){
                return feature.properties['ADM1_PCODE'];
            }).popup(function(feature){
                return feature.properties['ADM1_FR'];
            });

    dc.renderAll();
    var map = mapChart.map();
    zoomToGeom(geom);

    function zoomToGeom(geom){
        var bounds = d3.geo.bounds(geom);
        map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
    }

    var xReached = ['x'],
        reachedTotal = ['Total'],
        reachedFemale = ['Femmes'],
        reachedMale = ['Hommes'],
        xDelivery = ['x'],
        delivery = ['Delivery'];
    for (var i = 0; i < pGroup.length; i++) {
        if (pGroup[i].value.total !=0) {
            xReached.push(pGroup[i].key);
            reachedTotal.push(pGroup[i].value.total);
            reachedMale.push([pGroup[i].value.totalM]);
            reachedFemale.push(pGroup[i].value.totalF);
        }
    }
    pGroup.sort(sortDelivery);
    for (var i = 0; i < pGroup.length; i++) {
        if (pGroup[i].value.delivery !=0) {
            xDelivery.push(pGroup[i].key);
            delivery.push(pGroup[i].value.delivery);
        }
    }

    c3.generate({
        bindto: '#reachedBarchart',
        data: {
            x: 'x',
            columns: [xReached, reachedTotal, reachedMale, reachedFemale],
            colors: {
                'Total': blueLight,
                'Femmes': femaleColor,
                'Hommes': maleColor
            },
            type: 'bar'
        },
        axis: {
            x: {
                type: 'category',
                tick: {
                    outer: false
                }
            }
        },
        padding: {bottom:50}
    });

    c3.generate({
        bindto: '#deliveryBarchart',
        data: {
            x: 'x',
            columns: [xDelivery, delivery],
            color: [blueLight],
            type: 'bar'
        },
        axis: {
            x: {
                type: 'category',
                tick: {
                    outer: false,
                    culling: true,
                }
            },
            y: {
                tick: {
                    outer: false
                }
            }
        },
        padding: {bottom:50},
        tooltip: {
            format: {
                value: function(value, ration, id){
                    return value+'%';
                }
            }
        }
    });
}

var geomCall = $.ajax({
    type: 'GET',
    url: 'data/sn_adm1.json',
    dataType: 'json',
});

var dataCall = $.ajax({
    type: 'GET',
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1rJdR_5nfwFIjXLCWWLTN0ty56uSTYDeyIXsI2Y_EvtQ%2Fedit%3Fts%3D5d11096b%23gid%3D0&force=on',
    dataType: 'json',
});

$.when(geomCall, dataCall).then(function(geomArgs, dataArgs){
    var geom = geomArgs[0];
    var data = hxlProxyToJSON(dataArgs[0]);
    generateCharts(geom, data);
});