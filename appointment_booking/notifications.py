# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe

def get_notification_config():
	return {
		"for_doctype": {
			"Error Log": {"seen": 0},
			"Communication": {"status": "Open", "communication_type": "Communication"},
			"Visitor Appointment": {"status": "Open"},
			"ToDo": "frappe.core.notifications.get_things_todo",
			"Event": "frappe.core.notifications.get_todays_events",
			"Error Snapshot": {"seen": 0, "parent_error_snapshot": None},
			"Workflow Action": {"status": 'Open'}
		},
	}
