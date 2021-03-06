resultApp.factory("ResultService", ["$http", "$rootScope", "ICEService", "ErrorService", "ProgressService", function($http, $rootScope, ICEService, ErrorService, ProgressService) {
	var obj = {};
	obj.results = null;
	obj.response = {"update": {}};

	var jobIds = [];
	var jobId = null;
	
	obj.setResults = function(res) {
		obj.results = res;
	};
	
	obj.appendResults = function(res) {
		if(!obj.results) {
			obj.results = [];
		}
		
		obj.results.push.apply(obj.results, res);
	};

	obj.saveResults = function() {
		ProgressService.open("Save dashboard", obj.cancel, obj.update);
		
		$http.post("/submit", {"app": "save", "designs": obj.results, "ice": ICEService.ice}).then(
				function(resp) {
					jobIds = resp.data.job_ids;
					obj.listen();
				},
				function(errResp) {
					ErrorService.open(errResp.data.message);
				});
	};
	
	obj.cancel = function() {
		return PathwayGenieService.cancel(jobId);
	};
	
	obj.update = function() {
		return obj.response.update;
	};
	
	obj.listen = function() {
		if(jobIds.length == 0) {
			return;
		}
		
		jobId = jobIds[0];
		var source = new EventSource("/progress/" + jobId);

		source.onmessage = function(event) {
			obj.response = JSON.parse(event.data);
			status = obj.response.update.status;
			
			if(status == "cancelled" || status == "error" || status == "finished") {
				source.close();

				if(status == "finished") {
					for (i = 0; i < obj.response.result.length; i++) {
						if(obj.results[i].links.indexOf(obj.response.result[i]) == -1 ) {
							obj.results[i].links.push(obj.response.result[i]);
						}
					}
				}
				
				jobIds.splice(0, 1);
				listen();
			}
			
			$rootScope.$apply();
		};
		
		source.onerror = function(event) {
			source.close();
			jobIds.splice(0, 1);
			listen();
			onerror(event.message);
		}
	};

	return obj;
}]);