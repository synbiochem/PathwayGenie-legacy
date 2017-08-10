partsGenieApp.controller("partsGenieCtrl", ["$scope", "ErrorService", "PartsGenieService", "PathwayGenieService", "ProgressService", "ResultService", "UniprotService", function($scope, ErrorService, PartsGenieService, PathwayGenieService, ProgressService, ResultService, UniprotService) {
	var self = this;
	var jobId = null;
	var search = false;
	
	self.codons_regex = new RegExp("^[ACGTacgt\s]{3}$");
	self.query = PartsGenieService.query;
	self.response = {"update": {"values": [], "status": "waiting", "message": "Waiting..."}};

	self.restrEnzs = PathwayGenieService.restrEnzs;
	
	self.selectRestEnzs = function(selected) {
		self.restrEnzs = remove(self.restrEnzs, selected);
		self.query.filters.restr_enzs.push.apply(self.query.filters.restr_enzs, selected);
	}
	
	self.deselectRestEnzs = function(selected) {
		self.restrEnzs.push.apply(self.restrEnzs, selected);
		self.query.filters.restr_enzs = remove(self.query.filters.restr_enzs, selected);
	}

	self.templates = [
		{
			typ: "http://purl.obolibrary.org/obo/SO_0000001",
			name: "Defined sequence",
			seq: "",
			temp_params: {
				fixed: true,
				required: ["name", "seq"],
				valid: false,
				id: "_1"
			}
		},
		{
			typ: "http://purl.obolibrary.org/obo/SO_0000449",
			end: 100,
			name: "Randomised sequence",
			temp_params: {
				fixed: false,
				required: ["name", "len"],
				min_end: 1,
				max_end: 10000,
				valid: true,
				id: "_2"
			}
		},
		{
			typ: "http://purl.obolibrary.org/obo/SO_0000143",
			name: "Sequence of defined melting temperature",
			seq: "",
			parameters: {
				"Tm target": 70
			},
			temp_params: {
				fixed: true,
				required: ["name", "tm"],
				valid: true,
				id: "_3"
			}
		},
		{
			typ: "http://purl.obolibrary.org/obo/SO_0000296",
			name: "Origin of replication",
			seq: "",
			temp_params: {
				fixed: true,
				required: ["name", "seq"],
				valid: false,
				id: "_4"
			}
		},
		{
			typ: "http://purl.obolibrary.org/obo/SO_0000167",
			name: "Promoter",
			seq: "",
			temp_params: {
				fixed: true,
				required: ["name", "seq"],
				valid: false,
				id: "_5"
			}
		},
		{
			typ: "http://purl.obolibrary.org/obo/SO_0000139",
			name:"Ribosome binding site",
			end: 60,
			parameters: {
				"TIR target": 15000
			},
			temp_params: {
				fixed: false,
				required: ["name", "tir"],
				min_end: 35,
				max_end: 10000,
				valid: true,
				id: "_6"
			}
		},
		{
			typ: "http://purl.obolibrary.org/obo/SO_0000316",
			name: "Coding sequence",
			options: [
				{
					typ: "http://purl.obolibrary.org/obo/SO_0000316",
					name: "coding sequence",
					temp_params: {
						fixed: false
					}
				}
			],
			temp_params: {
				required: ["prot"],
				valid: false,
				id: "_7"
			}
		},
		{
			typ: "http://purl.obolibrary.org/obo/SO_0000141",
			name: "Terminator",
			seq: "",
			temp_params: {
				fixed: true,
				required: ["name", "seq"],
				valid: false,
				id: "_8"
			}
		},
	];
	
	self.copy = function(feature) {
		feature.temp_params.id = "_" + (new Date()).getTime();
	}
	
	self.selected = function() {
		return PartsGenieService.selected;
	};
	
	self.toggleSelected = function(selected) {
		return PartsGenieService.toggleSelected(selected);
	};
	
	self.setValid = function(valid) {
		if(PartsGenieService.selected) {
			PartsGenieService.selected.temp_params.valid = valid;
		}
	};
	
	self.addDesign = function() {
		PartsGenieService.addDesign();
	};
	
	self.copyDesign = function(index) {
		var origDesign = self.query.designs[index];
		var copiedDesign = angular.copy(origDesign);
		
		for(var i = 0; i < copiedDesign.features.length; i++) {
			copiedDesign.features[i].temp_params.id = "_" + i + "_" + (new Date()).getTime();
		}
		
		self.query.designs.push(copiedDesign);
	};
	
	self.removeDesign = function(index) {
		self.query.designs.splice(index, 1);
		self.toggleSelected(null);
	};
	
	self.organismRequired = function() {
		for(var i = 0; i < self.query.designs.length; i++) {
			design = self.query.designs[i];
		
			for(var j = 0; j < design.features.length; j++) {
				if(design.features[j].typ == "http://purl.obolibrary.org/obo/SO_0000139"
					|| design.features[j].typ == "http://purl.obolibrary.org/obo/SO_0000316") {
					return true;
				}
			}
		}
		
		return false;
	}
	
	self.searchUniprot = function(query) {
		search = true;
		
		PartsGenieService.searchUniprot(query).then(
			function(resp) {
				UniprotService.open(resp.data, PartsGenieService.selected)
				search = false;
			},
			function(errResp) {
				search = false;
			});
	};
	
	self.searching = function() {
		return search;
	}

	self.submit = function() {
		jobId = null
		self.response = {"update": {"values": [], "status": "running", "message": "Submitting..."}};
		error = null;
		self.toggleSelected(self.selected());
		ResultService.setResults(null);
		
		ProgressService.open(self.query["app"] + " dashboard", self.cancel, self.update);
		
		PathwayGenieService.submit(self.query).then(
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
					source.close();
					onerror(event.message);
				}
			},
			function(errResp) {
				onerror(errResp.data.message);
			});
	};
	
	self.cancel = function() {
		return PathwayGenieService.cancel(jobId);
	};
	
	self.update = function() {
		return self.response.update;
	};
	
	onerror = function(message) {
		self.response.update.status = "error";
		self.response.update.message = "Error";
		$scope.$apply();
		ErrorService.open(message);
	};
	
	remove = function(array, toRemove) {
		array = array.filter(function(elem) {
			return !toRemove.includes(elem);
		});
		
		return array;
	};
	
	self.queryJson = angular.toJson({selected: self.selected(), query: self.query}, true);
	
	$scope.$watch(function() {
		return self.selected();
	},               
	function(values) {
		self.queryJson = angular.toJson({selected: self.selected(), query: self.query}, true)
	}, true);
	
	$scope.$watch(function() {
		return self.query;
	},               
	function(values) {
		self.queryJson = angular.toJson({selected: self.selected(), query: self.query}, true)
	}, true);
}]);