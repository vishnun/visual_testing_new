/*
	Require and initialise PhantomCSS module
	Paths are relative to CasperJs directory

	This JS file reads testConfig.json, and runs the tests mentioned in that file.
*/

var fs = require( 'fs' );
var path = fs.absolute( fs.workingDirectory + '/phantomcss.js' );
var phantomcss = require( path );
require(fs.absolute(fs.workingDirectory + '/libs/jquery'));
var configs = require(fs.absolute(fs.workingDirectory + '/test_configs/testConfig.json'));
var baseImageFolder = configs['global']['screenShotDirectoryPath']+'/base_images';
var resultImageFolder = configs['global']['screenShotDirectoryPath']+'/diff_images';
var failedImageFolder = configs['global']['screenShotDirectoryPath'] + '/failures';

casper.test.begin( 'Visual Regression PhantomCSS Tests', function ( test ) {
	var screenShotFolder = configs['global']['screenShotDirectoryPath'];
	phantomcss.init( {
		rebase: casper.cli.get( "rebase" ),
		casper: casper,
		libraryRoot: fs.absolute( fs.workingDirectory + '' ),
		screenshotRoot: fs.absolute( fs.workingDirectory + baseImageFolder ),
		comparisonResultRoot: fs.absolute( fs.workingDirectory + resultImageFolder ),
    // cleanupComparisonImages: true,
		failedComparisonsRoot: fs.absolute( fs.workingDirectory + failedImageFolder ),
		addLabelToFailedImage: false,
    mismatchTolerance: 0.05
	});

	casper.on( 'remote.message', function ( msg ) {
		this.echo( msg );
	} );

	casper.on( 'error', function ( err ) {
		this.die( "PhantomJS has errored: " + err );
	} );

	casper.on( 'resource.error', function ( err ) {
		casper.log( 'Resource load error: ' + err, 'warning' );
	});

  var viewportWidth = configs['global']['viewports']['desktop']['width'];
  var viewportHeight = configs['global']['viewports']['desktop']['height'];

  casper.start( configs['global']['baseUrl'], function() {
    this.echo('BASE URL for testing: ' + this.getCurrentUrl(), 'info');
    this.echo('---------------------------------------------------------------');
  });

  casper.viewport(viewportWidth, viewportHeight );

  casper.eachThen(configs['tests'], function (testData) {

  var testObj = testData.data;
  var port = configs['global']['port'] && configs['global']['port'] != "" ? ":"+configs['global']['port'] : "";
	var baseURL = configs['global']['subdomain']+testObj['domain']+ port;
  var url = baseURL + testObj['relativeUrl'];
  var waitTime = testObj['waitTime'] || configs['global']['waitTime'];
	var cssSelector = testObj['cssSelector'];
	var moduleName = testObj['moduleName'];
	var viewport = testObj['viewport'];
	  switch(viewport) {
		  case "desktop":
			  viewportWidth = configs['global']['viewports']['desktop']['width']
			  viewportHeight = configs['global']['viewports']['desktop']['height'];
			  break;
		  case "mobile":
			  viewportWidth = configs['global']['viewports']['mobile']['width']
			  viewportHeight = configs['global']['viewports']['mobile']['height'];
			  break;
          case "mobile-landscape":
              viewportWidth = configs['global']['viewports']['mobile-landscape']['width']
              viewportHeight = configs['global']['viewports']['mobile-landscape']['height'];
              break;
		  case "tablet":
			  viewportWidth = configs['global']['viewports']['tablet']['width']
			  viewportHeight = configs['global']['viewports']['tablet']['height'];
			  break;
		  case "tablet-landscape":
			  viewportWidth = configs['global']['viewports']['tablet-landscape']['width']
			  viewportHeight = configs['global']['viewports']['tablet-landscape']['height'];
			  break;
		  default:
			  viewportWidth = configs['global']['viewports']['desktop']['width']
			  viewportHeight = configs['global']['viewports']['desktop']['height'];
	  }

	  casper.echo("Url: " + url + "  (ModuleName="+moduleName+")");
    //casper.setHttpAuth('username', 'password'); //If this is needed for the url


    casper.thenOpen(url,function(){
      casper.viewport(viewportWidth, casper.getElementsBounds('body')[0]['height'],
            casper.wait(waitTime, function () {
                var documentHeight = casper.getElementsBounds('body')[0]['height'];
                if(cssSelector){
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
  });

	casper.then( function now_check_the_screenshots() {
		// compare screenshots
		phantomcss.compareAll();
	} );

	//casper.then (function clean_diff_img_folder(){
	//	var diff_files = phantomcss.getCreatedDiffFiles();
	//	casper.eachThen(diff_files,function(response){
	//		this.echo(response.name);
	//	});
	//	//fs.move(diff_files,blah);
	//	//fs.remove(resultImageFolder)
    //
	//});

	function generateRandomString() {
		return ( Math.random() + 1 ).toString( 36 ).substring( 7 );
	}

	/*
	Casper runs tests
	*/
	casper.run( function () {
		console.log('\nExit Status: '+ phantomcss.getExitStatus())
		console.log('\nTHE END.');
		casper.test.done();
	} );
});
