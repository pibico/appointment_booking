frappe.views.calendar["Visitor Appointment"] = {
	field_map: {
		"start": "start",
		"end": "end",
		"id": "name",
		"title": "visitor",
		"allDay": "allDay",
		"eventColor": "color"
	},
	order_by: "appointment_date",
	gantt: false,
	get_events_method: "appointment_booking.appointment_booking.doctype.visitor_appointment.visitor_appointment.get_events"
};