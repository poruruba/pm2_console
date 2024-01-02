'use strict';

const HELPER_BASE = process.env.HELPER_BASE || "/opt/";
const Response = require(HELPER_BASE + 'response');
const BinResponse = require(HELPER_BASE + 'binresponse');
const TextResponse = require(HELPER_BASE + 'textresponse');

const pm2 = require('pm2');
const { exec } = require('child_process');
const streamBuffers = require('stream-buffers');
const archiver = require('archiver');
const path = require('path');

exports.handler = async (event, context, callback) => {
	var body = JSON.parse(event.body);
	console.log(body);

  // if (!event.requestContext.apikeyAuth || event.requestContext.apikeyAuth.apikey != APIKEY )
	// 	throw "wrong apikey";

	if( event.path == '/pm2-proc-list' ){
		return new Promise((resolve, reject) =>{
				pm2.connect(err =>{
						if( err ){
							pm2.disconnect();
							return reject(err);
						}

						pm2.list((err, processDescriptionList) =>{
								if( err )
										return reject(err);

								pm2.disconnect();
								resolve(new Response({ list: processDescriptionList }));
						})
				});
		});
	}else

	if( event.path == "/pm2-proc-restart" ){
		var pm2_id = body.pm2_id;

		return new Promise((resolve, reject) =>{
				pm2.connect(err =>{
						if( err ){
								pm2.disconnect();
								return reject(err);
						}

						pm2.restart(pm2_id, (err) =>{
								if( err )
										return reject(err);

								resolve(new Response({}));
						})
				});
		});

	}else if( event.path == "/pm2-proc-stop" ){
		var pm2_id = body.pm2_id;

		return new Promise((resolve, reject) =>{
				pm2.connect(err =>{
						if( err ){
								pm2.disconnect();
								return reject(err);
						}

						pm2.stop(pm2_id, (err) =>{
								if( err )
										return reject(err);

								pm2.disconnect();
								resolve(new Response({}));
						})
				});
		});

	}else if( event.path == "/pm2-proc-describe" ){
		var pm2_id = body.pm2_id;

		var desc = await pm2_describe(pm2_id);
		return new Response({ desc: desc });
	}else

	if( event.path == '/pm2-view-log'){
		var pm2_id = body.pm2_id;
		var type = body.type;

		var desc = await pm2_describe(pm2_id);
		var logfname = (type == 'error') ? desc.pm2_env.pm_err_log_path : desc.pm2_env.pm_out_log_path;
		console.log(logfname);

		var num = body.num;
		return new Promise((resolve, reject) =>{
			var exec_batch;
			if (body.order == 'head'){
				exec_batch = `cat ${logfname} | head -n ${num} | sed -r "s/\\x1B\\[([0-9]{1,2}(;[0-9]{1,2})*)?m//g" | col -bx`;
			} else if (body.order == 'tail'){
				exec_batch = `cat ${logfname} | tail -n ${num} | sed -r "s/\\x1B\\[([0-9]{1,2}(;[0-9]{1,2})*)?m//g" | col -bx`;
			}else{
				reject('unknown order');
			}
			exec(exec_batch, (err, stdout, stderr) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(new TextResponse("text/plain", stdout));
			});
		});
	}else
	if( event.path == '/pm2-get-log'){
		var pm2_id = body.pm2_id;
		var type = body.type;

		var desc = await pm2_describe(pm2_id);
		var logfname = (type == 'error') ? desc.pm2_env.pm_err_log_path : desc.pm2_env.pm_out_log_path;
		console.log(logfname);

		return new Promise((resolve, reject) =>{
			var dest_stream = new streamBuffers.WritableStreamBuffer();
			const archive = archiver('zip', {
				zlib: { level: 9 }
			});
			dest_stream.on('finish', () => {
				console.log('stream finish');
				var response = new BinResponse('application/zip', dest_stream.getContents());
				response.set_filename(path.basename(logfname) + '.zip');
				resolve(response);
			});

			archive.pipe(dest_stream);
			archive.on('error', (err) => {
				reject(err);
			});

			archive.file(logfname, { name: path.basename(logfname) });
			archive.finalize();
		});
	}else{
		throw "unknown endpoint";
	}
}

async function pm2_describe(pm2_id){
	return new Promise((resolve, reject) =>{
		pm2.connect(err =>{
				if( err ){
						pm2.disconnect();
						return reject(err);
				}

				pm2.describe(pm2_id, (err, processDescription) =>{
						if( err )
								return reject(err);

						pm2.disconnect();
						resolve(processDescription[0]);
				})
		});
	});
}