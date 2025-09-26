/*
 * File: utils.js
 * Author:  Li XianJing <xianjimli@hotmail.com>
 * Brief: some functions to help load dragbones.
 * Web: https://github.com/drawapp8 
 * Copyright (c) 2014  Li XianJing <xianjimli@hotmail.com>
 * 
 */

function createXMLHttpRequest() {
	var XMLHttpRequest = (function () {
		if (typeof window === 'undefined') {
			throw new Error('no window object present');
		}
		else if (window.XMLHttpRequest) {
			return window.XMLHttpRequest;
		}
		else if (window.ActiveXObject) {
			var axs = [
				'Msxml2.XMLHTTP.6.0',
				'Msxml2.XMLHTTP.3.0',
				'Microsoft.XMLHTTP'
			];
			for (var i = 0; i < axs.length; i++) {
				try {
					var ax = new(window.ActiveXObject)(axs[i]);
					return function () {
						if (ax) {
							var ax_ = ax;
							ax = null;
							return ax_;
						}
						else {
							return new(window.ActiveXObject)(axs[i]);
						}
					};
				}
				catch (e) {}
			}
			throw new Error('ajax not supported in this browser')
		}
		else {
			throw new Error('ajax not supported in this browser');
		}
	})();

	return new XMLHttpRequest();
}

function httpDoRequest(info) {
	var	xhr = createXMLHttpRequest();

	if(!info || !info.url) {
		return false;
	}

	var url = info.url;
	var data = info.data;
	var method = info.method ? info.method : "GET";

	//cross domain via proxy.
	if(!info.noProxy && url.indexOf("http") === 0 && url.indexOf(window.location.hostname) < 0) {
		url = '/proxy.php?url=' + window.btoa(url) + '&mode=native&full_headers=1&send_cookies=1&send_session=0';

		if(info.headers && info.headers["User-Agent"]) {
			var ua = info.headers["User-Agent"];
			url = url + "&ua="+ encodeURI(ua);
			delete info.headers["User-Agent"];
		}
	}
	
	xhr.open(method, url, true);

	if(info.noCache) {
		xhr.setRequestHeader('If-Modified-Since', '0');
	}

	if(info.headers) {
		for(var key in info.headers) {
			var value = info.headers[key];
			xhr.setRequestHeader(key, value);
		}
	}

	if(xhr) {
		xhr.send(info.data ? info.data : null);
		
		if(!xhr.onprogress) {
			xhr.onreadystatechange = function() {
				if(info.onProgress) {
					info.onProgress(xhr);
				}
				if(xhr.readyState === 4) {
					if(info.onDone) {
						info.onDone(true, xhr, xhr.responseText);
					}
				}
				//console.log("onreadystatechange:" + xhr.readyState);
				return;
			}
		}
		else {
			xhr.onprogress = function(e)  {
				var total = e.total;
				if(info.onProgress) {
					info.onProgress(xhr);
				}
				console.log("get:" + total);
			 }
			
			xhr.onload = function(e)  {
				if(info.onDone) {
					info.onDone(true, xhr, e.target.responseText);
				}
			}
			
			xhr.onerror = function(e)  {
				if(info.onDone) {
					info.onDone(false, xhr, xhr.responseText);
				}
			}
		}
	}

	return true;
}

function httpGetURL(url, onDone) {
	var rInfo = {};
	rInfo.url = url;
	rInfo.onDone = onDone;

	httpDoRequest(rInfo);

	return;
}

function httpGetJSON(url, onDone) {
	httpGetURL(url, function(result, xhr, data) {
		var json = null;
		if(result) {
			json = JSON.parse(data);
		}
		onDone(json);
	})

	return;
}

///////////////////////////////////////////////////////////////////////////////////////////

function loadDragonBoneArmature(textureJsonURL, skeletonJsonURL, textureURL, onDone) {
	var texture = new Image();

	texture.onload = function()	{
		httpGetJSON(textureJsonURL, function(data) {
			var textureData = data;

			httpGetJSON(skeletonJsonURL, function(data) {
				var skeletonData = data;
				var factory = new dragonBones.factorys.GeneralFactory();

				factory.addSkeletonData(dragonBones.objects.DataParser.parseSkeletonData(skeletonData));
				factory.addTextureAtlas(new dragonBones.textures.GeneralTextureAtlas(texture, textureData));
			
				for(var i = 0; i < skeletonData.armature.length; i++) {
					var name = skeletonData.armature[i].name;
					var armature = factory.buildArmature(name);

					if(i === 0) {
						onDone(armature);
					}
				}
			});
		});
	}

	texture.src = textureURL;

	return;
}

function onArmatureCreated(armature) {
	console.log("onArmatureCreated chamado com armature:", armature);
	
	var canvas = document.getElementById("canvas");
	if (!canvas) {
		console.error("ERRO: Canvas não encontrado!");
		return;
	}
	console.log("Canvas encontrado:", canvas.width + "x" + canvas.height);
	
	var ctx = canvas.getContext("2d");
	if (!ctx) {
		console.error("ERRO: Contexto 2D não disponível!");
		return;
	}
	console.log("Contexto 2D obtido com sucesso");

	if (!armature) {
		console.error("ERRO: Armature é null/undefined!");
		return;
	}

	// Verificar se o armature tem o método setPosition
	if (typeof armature.setPosition !== 'function') {
		console.error("ERRO: armature.setPosition não é uma função!");
		return;
	}

	armature.setPosition(300, 300);
	console.log("Posição do armature definida para (300, 300)");

	// Verificar animações disponíveis
	if (armature.animation && armature.animation.animationNameList) {
		console.log("Animações disponíveis:", armature.animation.animationNameList);
	} else {
		console.warn("AVISO: Nenhuma animação encontrada no armature");
	}

	var isRunning = true;
	var frameCount = 0;

	function update() {
		if (!isRunning) return;
		
		try {
			// Limpar canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			// Desenhar fundo para debug (opcional)
			if (frameCount < 10) {
				ctx.fillStyle = '#f0f0f0';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
			}

			// Avançar tempo da animação
			dragonBones.animation.WorldClock.clock.advanceTime(1/60);

			// Desenhar armature
			if (armature && typeof armature.draw === 'function') {
				armature.draw(ctx);
			} else {
				console.error("ERRO: armature.draw não é uma função!");
				isRunning = false;
				return;
			}

			frameCount++;
			if (frameCount % 60 === 0) {
				console.log("Renderizando frame:", frameCount);
			}

			requestAnimationFrame(update);
		} catch (error) {
			console.error("ERRO na função update:", error);
			isRunning = false;
		}
	}
	
	function changeAnimation() {
		try {
			if (!armature.animation || !armature.animation.animationNameList || armature.animation.animationNameList.length === 0) {
				console.warn("AVISO: Nenhuma animação disponível para trocar");
				return;
			}

			var animationName;
			do {
				var index = Math.floor(Math.random() * armature.animation.animationNameList.length);
				animationName = armature.animation.animationNameList[index];
			} while (animationName == armature.animation.getLastAnimationName() && armature.animation.animationNameList.length > 1);

			console.log("Trocando para animação:", animationName);
			armature.animation.gotoAndPlay(animationName);
		} catch (error) {
			console.error("ERRO ao trocar animação:", error);
		}
	}
	
	// Adicionar evento de clique
	if (canvas.onclick) {
		canvas.removeEventListener('click', canvas.onclick);
	}
	canvas.onclick = changeAnimation;
	
	// Adicionar armature ao clock
	try {
		dragonBones.animation.WorldClock.clock.add(armature);
		console.log("Armature adicionado ao WorldClock");
	} catch (error) {
		console.error("ERRO ao adicionar armature ao WorldClock:", error);
		return;
	}

	// Iniciar primeira animação
	changeAnimation();
	
	// Iniciar loop de renderização
	console.log("Iniciando loop de renderização...");
	update();

	return;
}

