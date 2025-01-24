var http = require('http');
var steem = require('steem');

steem.api.setOptions({ url: 'https://api.steemit.com' });

global.postData = {}
global.postSeq = []
global.topicSeq = {}

async function addCategory(postcode, category){
	if(global.topicSeq[category] == undefined){
		global.topicSeq[category] = [];
	}
	if(global.topicSeq[category].indexOf(postcode) == -1){
		global.topicSeq[category].push(postcode);
	}
	if(category == "hive-180932" || category == "wherein"){
		addCategory(postcode, "cn");
	}
}

async function SteemPuller(tag=undefined){
	var query = { limit : 10 };
	if(tag == "cn"){
		SteemPuller("hive-180932");
		SteemPuller("wherein");
	}
	if(tag != undefined){
		query["tag"] = tag;
	}
	steem.api.getDiscussionsByCreated(query, function(err, result) {
		if( err != null ){
			return;
		}
		for (i in result){
			let obj = result[i];
			let author = obj["author"];
			let permlink = obj["permlink"];
			if(global.postData["/"+author+"/"+permlink] == undefined){
				global.postSeq.push("/"+author+"/"+permlink);
			}
			obj.json_metadata = JSON.parse(obj.json_metadata);
			global.postData["/"+author+"/"+permlink] = obj;
			addCategory("/"+author+"/"+permlink, obj["category"]);
			for(i in obj.json_metadata.tags){
				addCategory("/"+author+"/"+permlink, obj.json_metadata.tags[i]);
			}
		}
	});
}

function httpServer(req, res){
	const { url, method } = req;
	if (url === '/api' && method === 'GET') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end('{"health":true}');
	} else if((url === "/api/posts" || url === "/api/posts/") && method === 'GET') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		let returns = [];
		let posts = global.postSeq.slice(-70);
		for (i in posts){
			returns.push({
				"title": global.postData[posts[i]]["title"],
				"sendtime": global.postData[posts[i]]["created"],
				"author": global.postData[posts[i]]["author"],
				"permlink": global.postData[posts[i]]["permlink"]
			});
		}
		res.end(JSON.stringify({code: 200, data: returns}));
	} else if( url.startsWith("/api/posts") ){
		res.writeHead(200, { 'Content-Type': 'application/json' });
		let pattern = /^\/api\/posts\/([A-Za-z0-9\-\._]+)\/([A-Za-z0-9\-\._]+)\/?$/;
		let execs = pattern.exec(url);
		if(execs == null){
			res.end('{"code": -404}');
			return;
		}
		let author=execs[1], permlink=execs[2];
		if(global.postData["/"+author+"/"+permlink] != undefined){
			res.end(JSON.stringify({code: 200, post: global.postData["/"+author+"/"+permlink]}));
			return;
		}
		steem.api.getContent(author, permlink, function(err, result) {
			if( err != null ){
				res.end('{"code": -404}');
				return;
			}
			if(result["author"] != author){
				res.end('{"code": -404}');
				return;
			}
			if(result["parent_author"] != ""){
				res.end('{"code": -404}');
				return;
			}
			result["json_metadata"] = JSON.parse(result["json_metadata"]);
			global.postData["/"+author+"/"+permlink] = result;
			for(i in result.json_metadata.tags){
				addCategory("/"+author+"/"+permlink, result.json_metadata.tags[i]);
			}
			addCategory("/"+author+"/"+permlink, result["category"]);
			res.end(JSON.stringify({code: 200, post: result}));
		});
		return;
	} else if( url.startsWith("/api/replies") ){
		res.writeHead(200, { 'Content-Type': 'application/json' });
		let pattern = /^\/api\/replies\/([A-Za-z0-9\-\._]+)\/([A-Za-z0-9\-\._]+)\/?$/;
		let execs = pattern.exec(url);
		if(execs == null){
			res.end('{"code": -404, "replies":[]}');
			return;
		}
		steem.api.getContentReplies(execs[1], execs[2], function(err, result) {
			if( err != null ){
				res.end('{"code": -404}');
				return;
			}
			res.end(JSON.stringify({code: 200, replies: result}));
		});
		return;
	} else if(url.startsWith("/api/forums")){
		res.writeHead(200, { 'Content-Type': 'application/json' });
		let pattern = /^\/api\/forums\/([A-Za-z0-9\-\._]+)\/?$/;
		let execs = pattern.exec(url);
		if(execs == null){
			res.end('{"code": -404}', );
			return;
		}
		if(global.topicSeq[execs[1]] == undefined){
			res.end('{"code":200,"data":[]}');
			SteemPuller(execs[1]);
			return;
		}
		let returns = [];
		let posts = global.topicSeq[execs[1]].slice(-70);
		if(posts.length <= 45){
			SteemPuller(execs[1]);
		}
		for (i in posts){
			returns.push({
				"title": global.postData[posts[i]]["title"],
				"sendtime": global.postData[posts[i]]["created"],
				"author": global.postData[posts[i]]["author"],
				"permlink": global.postData[posts[i]]["permlink"]
			});
		}
		res.end(JSON.stringify({code: 200, data: returns}));
	} else {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('404 Not Found');
	}
}

setInterval(SteemPuller, 1000);

server = http.createServer(httpServer);

server.listen(80, () => {
	console.log('Server is running on http://localhost:80');
});