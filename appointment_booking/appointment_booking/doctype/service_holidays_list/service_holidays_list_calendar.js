// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.views.calendar["Service Holidays List"] = {
	field_map: {
		"start": "holiday_date",
		"end": "holiday_date",
		"id": "name",
		"title": "description",
		"allDay": "allDay"
	},
	get_events_method: "appointment_booking.appointment_booking.doctype.service_holidays_list.service_holidays_list.get_events",
	filters: [
		{
			'fieldtype': 'Link',
			'fieldname': 'service_holidays_list',
			'options': 'Service Holidays List',
			'label': __('Service Holidays List')
		}
	]
}
