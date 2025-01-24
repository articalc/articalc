function fetchPostList(path, tips){
	let datadiag = document.getElementById("datadiag");
	fetch(path).then((e)=>{
		return e.json()
	}).then((w)=>{
		datadiag.innerHTML = '';
		datadiag.appendChild(document.createTextNode(tips));
		datadiag.appendChild(document.createElement("hr"));
		if(w.data.length <= 0){
			datadiag.appendChild(document.createTextNode("无帖子。"));
			return;
		}
		let seen = {};
		let list = document.createElement("ul");
		for(i in w.data){
			let pcode=w.data[i].author+'/'+w.data[i].permlink;
			if(seen[pcode] != undefined){
				continue;
			}
			seen[pcode] = true;
			let section = document.createElement("li");
			let alink = document.createElement("a");
			alink.innerText = w.data[i].title.replace(/\n/g,"");
			alink.href = '/posts/'+pcode;
			alink.onclick = ()=>{
				changePath('/posts/'+pcode);
				reloadByURI();
				return false;
			}
			section.appendChild(alink);
			list.appendChild(section);
		}
		datadiag.appendChild(list);
	})
}

function getRandomIntInclusive(n, m) {
	return Math.floor(Math.random() * (m - n + 1)) + n;
}

function fetchPost(url){
	let datadiag = document.getElementById("datadiag");
	fetch("/api/posts/"+url).then((e)=>{
		return e.json()
	}).then((w)=>{
		if(w.code != 200){
			Raise404Page();
			return;
		}
		datadiag.innerHTML = '';
		datadiag.appendChild(document.createTextNode("🏠 > 帖子"));
		datadiag.appendChild(document.createElement("hr"));
		let container = document.createElement("div");
		container.className = "t_container";
		container.innerHTML = marked.parse(
			"# "+w.post.title.replace(/\n/g,"")+
			"\n\n作者：@"+w.post.author+"，发布时间："+w.post.created.replace("T"," ")+
			"\n\n---\n"+
			w.post.body
		)+"<hr/>";
		datadiag.appendChild(container);
		if(window.steem_keychain != undefined){
			datadiag.appendChild(document.createTextNode("投票："));
			datadiag.appendChild(createVoteButton(w.post, "好评", 10000));
			datadiag.appendChild(createVoteButton(w.post, "中评", 0));
			datadiag.appendChild(createVoteButton(w.post, "差评", -10000));
			let reply_button = datadiag.appendChild(document.createElement("button"));
			reply_button.innerText = "发评文";
			reply_button.onclick = createReplyFunction(w.post);
			datadiag.appendChild(document.createTextNode("（注意：投票影响到Steem链的新币分配，别乱点差评，做个好人！！！）"));
		} else {
			datadiag.appendChild(document.createTextNode("请安装Steem Keychain插件后进行投票。"));
		}
		datadiag.appendChild(document.createElement("hr"));
		let temporary_blank = datadiag.appendChild(document.createTextNode("没有评文。"));
		fetch("/api/replies/"+url).then((e)=>{
			return e.json()
		}).then((w)=>{
			if(w.replies.length <= 0){
				return;
			}
			temporary_blank.remove();
			let orb = datadiag.appendChild(document.createElement("ul"));
			loadReplies(orb, w.replies);
		})
	})
}

function createReplyFunction(post){
	return function(){
		account = prompt("请输入发起评价的账户名：");
		if(account == null || account == ""){
			return;
		}
		text = prompt("请输入评文：");
		if(text == null || text == ""){
			return;
		}
		if(!confirm("账户："+account+"\n评文："+text+"\n确定吗？")){
			return;
		}
		permlink = "creply-"+post.author+"-"+getRandomIntInclusive(0, 99999)+"-"+getRandomIntInclusive(0, 99999);
		window.steem_keychain.requestPost(
			account, // account
			"", // title
			text, // body
			post.permlink, // parent_perm
			post.author, // parent_account
			'{}', // json_metadata
			permlink, // permlink
			JSON.stringify({
				author: account,
				permlink: permlink,
				max_accepted_payout:"100000.000 SBD",
				percent_steem_dollars: 0,
				allow_votes:true,
				allow_curation_rewards:true,
				extensions: [
					[0,getBeneficiaries(account)]
				]
			}), // comment_options
			()=>{
				reloadByURI();
			} // callback
		);
	}
}

function createVoteButton(post, text, power){
	let button = document.createElement("button");
	button.innerText = text;
	button.onclick = function(){
		account = prompt("请输入发起评价的账户名：");
		if(account != null && account != ""){
			window.steem_keychain.requestVote(account, post.permlink, post.author, power);
		}
	}
	return button;
}

function loadReplies(orb, replies){
	for(reply of replies){
		console.log(reply);
		(()=>{
			let section = orb.appendChild(document.createElement("li"));
			section.innerText = "@"+reply.author+"：";
			let sectionContent = orb.appendChild(document.createElement("dd"));
			sectionContent = sectionContent.appendChild(document.createElement("div"));
			sectionContent.style.border = "1px solid black";
			sectionContent.style.borderRadius = "3px";
			sectionContent.style.padding = "2px";
			sectionContent.innerHTML = marked.parse(reply.body)+"<hr/>";
			// Vote button
			if(window.steem_keychain != undefined){
				sectionContent.appendChild(document.createTextNode("投票："));
				sectionContent.appendChild(createVoteButton(reply, "好评", 10000));
				sectionContent.appendChild(createVoteButton(reply, "中评", 0));
				sectionContent.appendChild(createVoteButton(reply, "差评", -10000));
				let reply_button = sectionContent.appendChild(document.createElement("button"));
				reply_button.innerText = "发评文";
				reply_button.onclick = createReplyFunction(reply);
			} else {
				sectionContent.appendChild(document.createTextNode("请安装Steem Keychain插件后进行投票。"));
			}
			// Replies of replies
			let dom_repliesOfreply = orb.appendChild(document.createElement("ul"));
			dom_repliesOfreply.style.display = "none";
			fetch("/api/replies/"+reply.author+"/"+reply.permlink).then((e)=>{
				return e.json();
			}).then((w)=>{
				if(w.replies.length <= 0){
					dom_repliesOfreply.remove();
					return;
				}
				dom_repliesOfreply.style.display = "block";
				loadReplies(dom_repliesOfreply, w.replies);
			})
		})()
	}
}

function Raise404Page(){
	let datadiag = document.getElementById("datadiag");
	datadiag.innerHTML = '<h1 style="color:red">404</h1>';
	// 通知搜索引擎不要索引
	const metaRobots = document.createElement('meta');
	metaRobots.name = 'robots';
	metaRobots.content = 'noindex';
	document.head.appendChild(metaRobots);
}

function postingPage(){
	if(window.steem_keychain == undefined){
		changePath("/home");
		reloadByURI();
		return;
	}
	let datadiag = document.getElementById("datadiag");
	datadiag.innerHTML = '';
	datadiag.appendChild(document.createTextNode("🔧 > 创建TAO > 社交帖子"));
	datadiag.appendChild(document.createElement("hr"));
	let input_title = document.createElement("input");
	let input_author = document.createElement("input");
	let input_main = document.createElement("textarea");
	input_main.style.width = "calc(100% - 8px)";
	input_main.style.height = "500px";
	input_main.style.resize = "vertical";
	input_title.style.width = "calc(100% - 60px)";
	datadiag.appendChild(document.createTextNode("标题："));
	datadiag.appendChild(input_title);
	datadiag.appendChild(document.createElement("hr"));
	datadiag.appendChild(document.createTextNode("正文（支持Markdown）：\n"));
	datadiag.appendChild(input_main);
	datadiag.appendChild(document.createElement("hr"));
	datadiag.appendChild(document.createTextNode("分区："));
	// Tag Selector
	let select = document.createElement("select");
	let options = [
		{tag: ["azurlaneyuri"], text: "创作区"},
		{tag: ["hive-180932","cn","wherein"], text: "吹水区"}
	]
	for( opt of options ){
		select.appendChild((()=>{
			let dom_opt = document.createElement("option");
			dom_opt.innerText = opt.text;
			dom_opt.value = JSON.stringify(opt.tag);
			return dom_opt;
		})())
	}
	datadiag.appendChild(select);
	datadiag.appendChild(document.createTextNode(" 账户："));
	// Account
	datadiag.appendChild(input_author);
	datadiag.appendChild(document.createTextNode(" 密码："));
	datadiag.appendChild((()=>{
		let finput = document.createElement("input");
		finput.placeholder = "Keychain插件";
		finput.disabled = "disabled";
		return finput;
	})());
	datadiag.appendChild(document.createTextNode(" "));
	let sendbutton = document.createElement("button");
	sendbutton.innerText = "发送";
	datadiag.appendChild(sendbutton);
	sendbutton.onclick = function(){
		if(input_title.value == "" || input_main.value == ""){
			alert("你写帖子了吗？（请填写帖子标题和内容）");
			return;
		}
		if(input_author.value == ""){
			alert("你谁？（请填写账户名）");
			return;
		}
		permlink = "wci-"+getRandomIntInclusive(0, 99999)+"-"+getRandomIntInclusive(0, 99999);
		tags = JSON.parse(select.value);
		window.steem_keychain.requestPost(
			input_author.value, // account
			input_title.value, // title
			input_main.value, // body
			tags[0], // parent_perm
			"", // parent_account
			JSON.stringify({
				tags: tags
			}), // json_metadata
			permlink, // permlink
			JSON.stringify({
				author: input_author.value,
				permlink: permlink,
				max_accepted_payout:"100000.000 SBD",
				percent_steem_dollars: 0,
				allow_votes:true,
				allow_curation_rewards:true,
				extensions: [
					[0,getBeneficiaries(input_author.value)]
				]
			}), // comment_options
			()=>{
				changePath("/home");
				reloadByURI();
			} // callback
		);
	}
}

function getBeneficiaries(author){
	if (author == "misaka4717"){
		return {"beneficiaries": [
			{
				"account": "misaka4717",
				"weight": 10000
			}
		]};
	}
	return {"beneficiaries": [
		{
			"account": "misaka4717",
			"weight": 3
		},
		{
			"account": author,
			"weight": 97
		}
	]}
}

function changePath(path){
	const newUrl = new URL(window.location);
	newUrl.pathname = path;
	history.pushState({}, '', newUrl);
}

function reloadByURI(){
	let path = location.pathname;
	if(path == "/about"){
		fetch("/assets/about.partial.htm").then((e)=>{
			return e.text();
		}).then((q)=>{
			let datadiag = document.getElementById("datadiag");
			datadiag.innerHTML = q;
		})
		return;
	}
	if(path == "/tos"){
		fetch("/assets/tos.partial.htm").then((e)=>{
			return e.text();
		}).then((q)=>{
			let datadiag = document.getElementById("datadiag");
			datadiag.innerHTML = q;
		})
		return;
	}
	if(path == "/home"){
		fetch("/assets/home.partial.htm").then((e)=>{
			return e.text();
		}).then((q)=>{
			let datadiag = document.getElementById("datadiag");
			datadiag.innerHTML = q;
			setTimeout(()=>{
				registerLink("link_283719", "/trends/azurlaneyuri");
    			registerLink("link_297113", "/trends/cn");
			}, 100);
		})
		return;
	}
	if(path == "/"){
		changePath("/home");
		reloadByURI();
		return;
	}
	if(path == "/trends/hive-180932" || path == "/trends/wherein"){
		changePath("/trends/cn");
		reloadByURI();
		return;
	}
	if(path == "/posting"){
		postingPage();
		return;
	}
	if(path == "/trends/steemglobal"){
		// 如果是展示Steem首页
		fetchPostList("/api/posts", "🏠 > 全局");
		return;
	}
	if(path == "/trends/cn"){
		// 如果是展示cn标签（Steem中文社区）
		fetchPostList("/api/forums/cn", "🏠 > 标签:cn（吹水区）");
		return;
	}
	if(path == "/trends/azurlaneyuri"){
		// 如果是展示本社区首页
		fetchPostList("/api/forums/azurlaneyuri", "🏠 > 标签:azurlaneyuri（创作区）");
		return;
	}
	// 如果是标签Trends
	let pattern = /^\/trends\/([A-Za-z0-9\-\._]+)\/?$/;
	let execs = pattern.exec(path);
	if(execs != null){
		fetchPostList("/api/forums/"+execs[1], "🏠 > 标签:"+execs[1]);
		return;
	}
	// 如果是帖子
	pattern = /^\/posts\/([A-Za-z0-9\-\._]+)\/([A-Za-z0-9\-\._]+)\/?$/;
	execs = pattern.exec(path);
	if(execs != null){
		fetchPost(execs[1]+"/"+execs[2]);
		return;
	}
	Raise404Page();
}

setTimeout(reloadByURI,100);
setTimeout(()=>{
	document.getElementById("link_posting").onclick = ()=>{
		changePath("/posting");
		reloadByURI();
		return false;
	}
	document.getElementById("link_about").onclick = ()=>{
		changePath("/about");
		reloadByURI();
		return false;
	}
	document.getElementById("link_tos").onclick = ()=>{
		changePath("/tos");
		reloadByURI();
		return false;
	}
	document.getElementById("link_home").onclick = ()=>{
		changePath("/home");
		reloadByURI();
		return false;
	}
},100);

function registerLink(pid, link){
	document.getElementById(pid).onclick = ()=>{
		changePath(link);
		reloadByURI();
		return false;
	}
}