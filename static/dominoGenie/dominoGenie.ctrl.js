dominoGenieApp.controller("dominoGenieCtrl", ["$scope", "ErrorService", "ICEService", "PathwayGenieService", "ProgressService", "ResultService", function($scope, ErrorService, ICEService, PathwayGenieService, ProgressService, ResultService) {
	var self = this;
	self.file_name = null;
	self.file_content = null
	
	self.query = {
			"app": "DominoGenie",
			"melt_temp": 70,
			"circular": true
		};
	
	self.response = {"update": {}};
	
	var jobId = null;

	self.connected = function() {
		return ICEService.connected;
	}
	
	self.submit = function() {
		reset();
		
		// Merge self.query and ICE parameters.
		var query = $.extend({}, self.query, {'ice': ICEService.ice});
		
		PathwayGenieService.submit(query).then(
			function(resp) {
				jobId = resp.data.job_id;
				var source = new EventSource("/progress/" + jobId);

				source.onmessage = function(event) {
					self.response = JSON.parse(event.data);
					status = self.response.update.status;
					
					if(status == "cancelled" || status == "error" || status == "finished") {
						source.close();
						
						if(status == "finished") {
							ResultService.setResults(self.response.result);
						}
					}
					
					$scope.$apply();
				};
				
				source.onerror = function(event) {
					self.response.update.status = "error";
					self.response.update.message = "Error";
					$scope.$apply();
				}
				
				ProgressService.open(self.query["app"] + " dashboard", self.cancel, self.update);
			},
			function(errResp) {
				ErrorService.open(errResp.data.message);
			});
	};
	
	self.cancel = function() {
		return PathwayGenieService.cancel(jobId);
	};
	
	self.update = function() {
		return self.response.update;
	};
	
	$scope.$watch(function() {
		return self.file_content;
	},               
	function(values) {
		// Parse DoE file:
		if(values) {
			var lines = values.match(/[^\r\n]+/g);
			
			tokens = lines[0].split("\t")
			self.query.restr_enzs = tokens.slice(1, tokens.length);
			
			var designs = []
			
			for(var i=1; i < lines.length; i++ ) {
				tokens = lines[i].split("\t")
				designs.push({"name": tokens[0], "design": tokens.slice(1, tokens.length)})
			}
			
			self.query.designs = designs;
		}
	}, true);

	reset = function() {
		status = {"update": {}};
		error = null;
		ResultService.setResults(null);
	};
}]);