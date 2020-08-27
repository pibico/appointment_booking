import frappe

def set_appointment_as_pending():
	frappe.db.sql("""update `tabVisitor Appointment` set `status`='Pending'
		where appointment_date is not null
		and appointment_date < CURDATE()
		and `status` not in ('Closed', 'Cancelled')""")