# -*- coding: utf-8 -*-
# Copyright (c) 2020, PibiCo and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
# From patient_appointment on healthcare as reference
import json
from frappe.utils import getdate, add_days, get_time
from frappe.model.mapper import get_mapped_doc
from frappe import _
import datetime
# Import libraries for creating qr_codes
import qrcode
from PIL import Image
import base64
from io import BytesIO

class VisitorAppointment(Document):

	def on_update(self):
		today = datetime.date.today()
		appointment_date = getdate(self.appointment_date)

		# If appointment created for today set as open
		if today == appointment_date:
			frappe.db.set_value("Visitor Appointment", self.name, "status", "Open")
			self.reload()

	def validate(self):
		self.set_appointment_datetime()
		end_time = datetime.datetime.combine(getdate(self.appointment_date), get_time(self.appointment_time)) + datetime.timedelta(minutes=float(self.duration))
		overlaps = frappe.db.sql("""
		select
			name, practitioner, visitor, appointment_time, duration
		from
			`tabVisitor Appointment`
		where
			appointment_date=%s and name!=%s and status NOT IN ("Closed", "Cancelled")
			and (practitioner=%s or visitor=%s) and
			((appointment_time<%s and appointment_time + INTERVAL duration MINUTE>%s) or
			(appointment_time>%s and appointment_time<%s) or
			(appointment_time=%s))
		""", (self.appointment_date, self.name, self.practitioner, self.visitor,
		self.appointment_time, end_time.time(), self.appointment_time, end_time.time(), self.appointment_time))

		if overlaps:
			frappe.throw(_("""La cita se solapa con {0}.<br> {1} ha reservado cita con
			{2} el {3} durante {4} minuto(s).""").format(overlaps[0][0], overlaps[0][1], overlaps[0][2], overlaps[0][3], overlaps[0][4]))

	def set_appointment_datetime(self):
		self.appointment_datetime = "%s %s" % (self.appointment_date, self.appointment_time or "00:00:00")

	def after_insert(self):
		url_site =  frappe.utils.get_url()
		input_str = url_site + "/Visitor%20Appointment/" + self.name
		qr = qrcode.make(input_str)
		temp = BytesIO()
		qr.save(temp, "PNG")
		temp.seek(0)
		b64 = base64.b64encode(temp.read())
		qr_Code = "data:image/png;base64,{0}".format(b64.decode("utf-8"))
		frappe.db.set_value("Visitor Appointment", self.name, "qr_code", qr_Code)

		appointment = self

def appointment_cancel(appointment_id):
	appointment = frappe.get_doc("Visitor Appointment", appointment_id)
	frappe.msgprint(_("Appointment cancelled"))

@frappe.whitelist(allow_guest=True)
def get_availability_data(date, practitioner, department=None):
	"""
	Get availability data of 'practitioner' on 'date'
	:param date: Date to check in schedule
	:param practitioner: Name of the practitioner
        :param department: Name of the department
	:return: dict containing a list of available slots, list of appointments and time of appointments
	"""

	date = getdate(date)
	weekday = date.strftime("%A")

	available_slots = []
	slot_details = []
	practitioner_schedule = None

	practitioner_obj = frappe.get_doc("Service Practitioner", practitioner)
	practitioner_name = practitioner_obj.name
#>
	practitioner_department = practitioner_obj.department
	if not department:
		department = practitioner_department
#<
	if practitioner_name:
		# Check if it is Holiday
		if is_holiday(practitioner_name, date):
			frappe.throw(_("El {0} el profesional no ofrece servicios".format(date)))

	# get practitioners schedule
	if practitioner_obj.practitioner_schedules:
		for schedule in practitioner_obj.practitioner_schedules:
			if schedule.schedule:
				practitioner_schedule = frappe.get_doc("Practitioner Schedule", schedule.schedule)
			else:
				frappe.throw(_("{0} no tiene Horario Creado. A&ntilde;adelo a los Datos Maestros de Horarios".format(practitioner)))

			if practitioner_schedule:
				available_slots = []
				for t in practitioner_schedule.time_slots:
					if weekday == t.day:
						available_slots.append(t)

				if available_slots:
					appointments = []

				available_slots = []
				for t in practitioner_schedule.time_slots:
					if weekday == t.day:
						available_slots.append(t)

				if available_slots:
					appointments = []

					if schedule.department:
						slot_name  = schedule.schedule+" - "+schedule.department
						# fetch all appointments to service unit
						appointments = frappe.get_all(
							"Visitor Appointment",
							filters={"department": schedule.department, "appointment_date": date, "status": ["not in",["Cancelled"]]},
							fields=["name", "appointment_time", "duration", "status"])

					if practitioner_department == "Varios":
						if schedule.department == department:
							slot_details.append({"slot_name":slot_name, "department":schedule.department,
	                	                                "available_slots":available_slots, 'appointments': appointments})
						else:
							slot_details.append({"slot_name":slot_name, "department":'',
                                                                "available_slots":available_slots, 'appointments': appointments})

					else:
						slot_details.append({"slot_name":slot_name, "department":schedule.department,
							"available_slots":available_slots, 'appointments': appointments})

	else:
		frappe.throw(_("{0} no tiene Horario Creado. A&ntilde;adelo a los Datos Maestros de Horarios".format(practitioner)))

	if not available_slots and not slot_details:
		# TODO: return available slots in nearby dates
		frappe.throw(_("Profesional no disponible el {0}").format(weekday))

	return {
		"slot_details": slot_details
	}


@frappe.whitelist(allow_guest=True)
def get_department(practitioner):
	practitioner_dt = frappe.get_doc("Service Practitioner", practitioner)
	department = []
	for schedule in practitioner_dt.practitioner_schedules:
		department.append(schedule.department)
	return department

def is_holiday(practitioner, date=None):
	'''Returns True there is a holiday on the given date
 	:param practitioner: Practitioner selected for Appointment
	:param date: Date to check. Will check for today if None'''

	holiday_list = frappe.get_value("Service Practitioner", practitioner, "service_holidays_list")
	if not date:
		date = today()

	if holiday_list:
		return frappe.get_all('Service Holidays List', dict(name=holiday_list, holiday_date=date)) and True or False

@frappe.whitelist(allow_guest=True)
def get_duration(appointment_type):
  duration = frappe.get_value("Appointment Type", appointment_type, "default_duration")
  return duration

@frappe.whitelist()
def update_status(appointment_id, status):
	frappe.db.set_value("Visitor Appointment", appointment_id, "status", status)
	appointment_booked = True
	if status == "Cancelled":
		appointment_booked = False
		appointment_cancel(appointment_id)

@frappe.whitelist()
def set_open_appointments():
	today = getdate()
	frappe.db.sql(
		"update `tabVisitor Appointment` set status='Open' where status = 'Scheduled'"
		" and appointment_date = %s", today)

@frappe.whitelist()
def set_pending_appointments():
	today = getdate()
	frappe.db.sql(
		"update `tabVisitor Appointment` set status='Pending' where status in "
		"('Scheduled','Open') and appointment_date < %s", today)

@frappe.whitelist()
def get_events(start, end, filters=None):
	"""Returns events for Gantt / Calendar view rendering.
	:param start: Start date-time.
	:param end: End date-time.
	:param filters: Filters (JSON).
	"""
	from frappe.desk.calendar import get_event_conditions
	conditions = get_event_conditions("Visitor Appointment", filters)

	data = frappe.db.sql("""
		select
		`tabVisitor Appointment`.name, `tabVisitor Appointment`.visitor,
		`tabVisitor Appointment`.practitioner, `tabVisitor Appointment`.status,
		`tabVisitor Appointment`.duration,
		timestamp(`tabVisitor Appointment`.appointment_date, `tabVisitor Appointment`.appointment_time) as 'start',
		`tabAppointment Type`.color
		from
		`tabVisitor Appointment`
		left join `tabAppointment Type` on `tabVisitor Appointment`.appointment_type=`tabAppointment Type`.name
		where
		(`tabVisitor Appointment`.appointment_date between %(start)s and %(end)s)
		and `tabVisitor Appointment`.status != 'Cancelled' and `tabVisitor Appointment`.docstatus < 2 {conditions}""".format(conditions=conditions),
		{"start": start, "end": end}, as_dict=True, update={"allDay": 0})

	for item in data:
		item.end = item.start + datetime.timedelta(minutes = item.duration)

	return data
