/*
(c) ESS 2015-16
*/
frappe.listview_settings['Visitor Appointment'] = {
	filters: [["status", "=", "Open"]],
	get_indicator: function(doc) {
		var colors = {
			"Open": "orange",
			"Scheduled": "yellow",
			"Closed": "green",
			"Cancelled": "red",
			"Expired": "grey"
		};
		return [__(doc.status), colors[doc.status], "status,=," + doc.status];
	}
};