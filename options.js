// Set form values from current preferences
browser.runtime.sendMessage({
	get: "oPrefs"
}).then((response) => {
	var oSettings = response['prefs'];
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	for (var i=0; i<chks.length; i++){
		if (oSettings[chks[i].name] == true) chks[i].checked = true;
		else chks[i].checked = false;
	}
	// Selects
	var sels = document.querySelectorAll('select[name^="click"]');
	for (var i=0; i<sels.length; i++){
		var selopt = document.querySelector('select[name="' + sels[i].name + '"] option[value="' + oSettings[sels[i].name] + '"]');
		selopt.setAttribute('selected', 'selected');
	}
}).catch((err) => {
	console.log('Problem getting settings: '+err.message);
});

// Send changes to background for storage
function updatePref(evt){
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	var oSettings = {};
	for (var i=0; i<chks.length; i++){
		oSettings[chks[i].name] = chks[i].checked;
	}
	// Selects
	var sels = document.querySelectorAll('select[name^="click"]');
	for (var i=0; i<sels.length; i++){
		oSettings[sels[i].name] = sels[i].value;
	}
	// Send update to background
	browser.runtime.sendMessage({
		update: oSettings
	});
}

// Attach event handler to the checkboxes and selects
var chks = document.querySelectorAll('.chk input[type="checkbox"]');
for (var i=0; i<chks.length; i++){
	chks[i].addEventListener('change', updatePref, false);
}
var sels = document.querySelectorAll('select[name^="click"]');
for (var i=0; i<sels.length; i++){
	sels[i].addEventListener('change', updatePref, false);
}
