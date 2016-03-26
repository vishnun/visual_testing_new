/*
 Require and initialise PhantomCSS module
 Paths are relative to CasperJs directory

 This JS file reads .csv file passed by user, and runs the tests mentioned in that file.
 */

var fs = require( 'fs' );
var path = fs.absolute( fs.workingDirectory + '/phantomcss.js' );
var phantomcss = require( path );
require(fs.absolute(fs.workingDirectory + '/libs/jquery'));
var system = require('system');

if(system.env.phantomcss_viewport_for_tests == "null") {
    viewportType = "All";
} else {
    viewportType = system.env.phantomcss_viewport_for_tests;
}

if(system.env.phantomcss_csvfile == "null") {
    csvPath = "./productionUrls.csv";
} else {
    csvPath = system.env.phantomcss_csvfile;
}

var port              = 80;
var waitTime          = 5000;
var screenShotDirectoryPath = '/screenshots';
var baseImageFolder = screenShotDirectoryPath + '/base_images';
var resultImageFolder = screenShotDirectoryPath + '/diff_images';
var failedImageFolder = screenShotDirectoryPath  + '/failures';

casper.test.begin( '\nVisual Regression PhantomCSS Tests', function () {
    phantomcss.init( {
        rebase: casper.cli.get( "rebase" ),
        casper: casper,
        libraryRoot: fs.absolute( fs.workingDirectory + '' ),
        screenshotRoot: fs.absolute( fs.workingDirectory + baseImageFolder ),
        comparisonResultRoot: fs.absolute( fs.workingDirectory + resultImageFolder ),
        failedComparisonsRoot: fs.absolute( fs.workingDirectory + failedImageFolder ),
        addLabelToFailedImage: false,
        mismatchTolerance: 0.05
    } );

    casper.on( 'remote.message', function ( msg ) {
        this.echo( msg );
    } );

    casper.on( 'error', function ( err ) {
        this.die( "PhantomJS has errored: " + err );
    } );

    casper.on( 'resource.error', function ( err ) {
        casper.log( 'Resource load error: ' + err, 'warning' );
    });

    var viewportWidth = 1200;
    var viewportHeight = 1024;

    casper.echo("\n------------------- Configs --------------------------");
    casper.echo("csvPath = "+csvPath);
    casper.echo("viewportType = "+viewportType);
    casper.echo("screenShotDirectoryPath = "+screenShotDirectoryPath);
    casper.echo ("--------------------------------------------------------");

    if (csvPath == null)
        throw new Error('Please enter valid path to CSV file.');

    function ViewportUnspecifiedException(message) {
        this.name = 'ViewportUnspecifiedError';
        this.message = message || "ERROR: Viewport value should be one of All/ desktop / mobile / mobile-landscape / tablet / tablet-landscape";
    };


    var viewport = viewportType.toString().toUpperCase().trim();
    try{
        if (["ALL", "MOBILE","MOBILE-LANDSCAPE","TABLET","TABLET-LANDSCAPE","DESKTOP"].indexOf(viewport) < 0) {
            throw new ViewportUnspecifiedException();
        }
    }
    catch(e){
        if (e instanceof ViewportUnspecifiedException){
            console.log(e.name);
            console.error([e.message]);
            casper.exit();
        }
    }

    casper.start(function() {
        this.echo('URL: ' + this.getCurrentUrl(), 'info');
        this.echo('---------------------------------------------------------------');
    });
    casper.viewport(viewportWidth, viewportHeight );

    var result = csv2json(csvPath);

    casper.echo("Number of URLs found in CSV ("+ csvPath+"): "+result.length);

    casper.eachThen(result, function (testData) {
        var testObj = testData.data;
        var waitTime = testObj['waitTime'] || waitTime;
        var url = testObj['Url'];
        var moduleName = testObj['moduleName'];
        var viewport = viewportType.toString().toUpperCase().trim();

        switch(viewport) {

            case "MOBILE":
                viewportWidth = 320;
                viewportHeight = 568;
                capturescreenshot(url,moduleName + ' on mobile',viewportWidth,waitTime);
                break;

            case "MOBILE-LANDSCAPE":
                viewportWidth = 568;
                viewportHeight = 320;
                capturescreenshot(url,moduleName + ' on mobile-landscape',viewportWidth,waitTime);
                break;

            case "TABLET":
                viewportWidth = 768;
                viewportHeight = 1024;
                capturescreenshot(url,moduleName + ' on tablet',viewportWidth,waitTime);
                break;

            case "TABLET-LANDSCAPE":
                viewportWidth = 1024;
                viewportHeight = 768;
                capturescreenshot(url,moduleName + ' on tablet-landscape',viewportWidth,waitTime);
                break;

            case "DESKTOP":
                viewportWidth = 1200;
                viewportHeight = 1024;
                capturescreenshot(url,moduleName + ' on desktop',viewportWidth,waitTime);
                break;

            case "ALL":
                viewportWidth = 1200;
                viewportHeight = 1024;
                capturescreenshot(url,moduleName + ' on desktop',viewportWidth,waitTime);

                viewportWidth = 320;
                viewportHeight = 568;
                capturescreenshot(url,moduleName + ' on mobile',viewportWidth,waitTime);

                viewportWidth = 568;
                viewportHeight = 320;
                capturescreenshot(url,moduleName + ' on mobile-landscape',viewportWidth,waitTime);

                viewportWidth = 768;
                viewportHeight = 1024;
                capturescreenshot(url,moduleName + ' on tablet',viewportWidth,waitTime);

                viewportWidth = 1024;
                viewportHeight = 768;
                capturescreenshot(url,moduleName + ' on tablet-landscape',viewportWidth,waitTime);
                break;
        }

    });

    function capturescreenshot(url,moduleName,viewportWidth,waitTime) {
        casper.thenOpen(url, function () {
            casper.echo("\nUrl: " + url + "  (Description=" + moduleName + ")");
            //casper.setHttpAuth('username', 'password'); //If this is needed for the url
            casper.viewport(viewportWidth, casper.getElementsBounds('body')[0]['height'],
                casper.wait(waitTime, function () {
                    var documentHeight = casper.getElementsBounds('body')[0]['height'];
                    var urlString = url.toString().trim();
                    var cssSelector = ""
                    if (urlString.indexOf("#") > -1){
                        var splitUrl = urlString.split('#');
                        splitUrl[0].toString().trim();
                        splitUrl[1].toString().trim();
                        cssSelector = '#'+splitUrl[1].toString().trim();
                        cssSelectorSpecified = true;
                    }

                    if(cssSelector != ""){
                        casper.reload
                        phantomcss.screenshot(cssSelector, moduleName)
                    }else
                    {
                        phantomcss.screenshot({
                            top: 0,
                            left: 0,
                            width: viewportWidth,
                            height: documentHeight
                        }, moduleName);
                    }
                })
            );
        });
    }

    casper.then( function now_check_the_screenshots() {
        phantomcss.compareAll();
    } );

    function csv2json(filePath) {

        var json = [];
        var data = fs.read(filePath);

        // Get comma separated sub strings, excluding those inside double quotes.
        var getCommaSeparated = function (str) {
            return str.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        };

        var csv = data.toString().split(/\r\n|\n|\r/);
        var tokens = getCommaSeparated(csv[0]);

        for(var i=1;i < csv.length;i++) {
            var content = getCommaSeparated(csv[i]);
            var tmp = {};
            for(var j=0;j < tokens.length; j++) {
                try {
                    tmp[tokens[j]] = content[j];
                } catch(err) {
                    tmp[tokens[j]] = "";
                }
            }
            json.push(tmp);
        }

        return json;
    }

    /* Casper runs tests */
    casper.run( function () {
        console.log('\nExit Status: '+ phantomcss.getExitStatus())
        console.log('\nTHE END.');
        casper.test.done();
    } );
} );
