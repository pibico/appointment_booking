// Copyright (c) 2020, PibiCo and contributors
// For license information, please see license.txt

frappe.ui.form.on('Visitor Appointment', {
	refresh: function(frm) {
		frm.set_query("practitioner", function() {
			return {
				filters: {
					'department': frm.doc.department
				}
			};
		});
		frm.set_query("department", function(){
			return {
				filters: {
					"is_group": false,
					"allow_appointments": true
				}
			};
		});
		if(frm.doc.status == "Open" && !frm.doc.__islocal){
			frm.add_custom_button(__('Cancel'), function() {
				btn_update_status(frm, "Cancelled");
			});
      frm.add_custom_button(__('Close'), function() {
				btn_update_status(frm, "Closed");
			});
			frm.add_custom_button(__('Reschedule'), function() {
				check_and_set_availability(frm);
			});
		}
		if(frm.doc.status == "Scheduled" && !frm.doc.__islocal){
			//frm.add_custom_button(__('Cancel'), function() {
			//	btn_update_status(frm, "Cancelled");
			//});
			frm.add_custom_button(__('Reschedule'), function() {
				check_and_set_availability(frm);
			});
		}
		if(frm.doc.status == "Pending" && !frm.doc.__islocal){
			frm.add_custom_button(__('Set Open'), function() {
				btn_update_status(frm, "Open");
			});
      frm.add_custom_button(__('Close'), function() {
				btn_update_status(frm, "Closed");
			});
			frm.add_custom_button(__('Cancel'), function() {
				btn_update_status(frm, "Cancelled");
			});
		}
	},
	check_availability: function(frm) {
		check_and_set_availability(frm);
	},
	onload:function(frm){
		if(frm.is_new()) {
			frm.set_value("appointment_time", null);
			frm.disable_save();
		}
	}
});

var check_and_set_availability = function(frm) {
	var selected_slot = null;
	var duration = null;
 
  if (!frm.doc.appointment_type) {
    frappe.msgprint (__("You must choose the Appointment Type First"));
    return(false);
  }

	show_availability();

	function show_empty_state(practitioner, appointment_date) {
		frappe.msgprint({
			title: __('Not Available'),
			message: __("Practitioner {0} not available on {1}", [practitioner.bold(), appointment_date.bold()]),
			indicator: 'red'
		});
	}

	function show_availability() {
		let selected_practitioner = '';
		var d = new frappe.ui.Dialog({
			title: __("Check Availability"),
			fields: [
				{ fieldtype: 'Link', options: 'Service Department', reqd:1, fieldname: 'department', label: 'Department'},
				{ fieldtype: 'Column Break'},
				{ fieldtype: 'Link', options: 'Service Practitioner', reqd:1, fieldname: 'practitioner', label: 'Practitioner'},
				{ fieldtype: 'Column Break'},
				{ fieldtype: 'Date', reqd:1, fieldname: 'appointment_date', label: 'Date'},
				{ fieldtype: 'Section Break'},
				{ fieldtype: 'HTML', fieldname: 'available_slots'}
			],
			primary_action_label: __("Settle Time"),
			primary_action: function() {
				frm.set_value('appointment_time', selected_slot);
				frm.set_value('practitioner', d.get_value('practitioner'));
				frm.set_value('department', d.get_value('department'));
        frm.set_value('appointment_date', d.get_value('appointment_date'));
        frm.set_value('status', 'Scheduled');
        d.hide();
				frm.enable_save();
				frm.save();
				frm.enable_save();
				d.get_primary_btn().attr('disabled', true);
			}
		});

		d.set_values({
			'practitioner': frm.doc.practitioner,
      'appointment_date': frm.doc.appointment_date
		});
  
    //frappe.call({
		//	"method": "frappe.client.get",
		//	args: {
		//		doctype: "Appointment Type",
		//		name: frm.doc.appointment_type
		//	},
		//	callback: function (data) {
		//		var department = data.message.department;
    //    d.set_values({'department': department});
    //    frm.toggle_enable('appointment_type', false);
		//	}
		//}); 
   
		d.fields_dict["department"].df.onchange = () => {
			d.set_values({
				'practitioner': ''
			});
      var department = d.get_value('department');
			if(department){
				d.fields_dict.practitioner.get_query = function() {
					return {
						filters: {
							"department": department
						}
					};
				};
        
			}
		};

		// disable dialog action initially
		d.get_primary_btn().attr('disabled', true);

		// Field Change Handler

		var fd = d.fields_dict;

    d.fields_dict["appointment_date"].df.onchange = () => {
		 show_slots(d, fd);
		};
    
		d.fields_dict["practitioner"].df.onchange = () => {
			if(d.get_value('practitioner') && d.get_value('practitioner') != selected_practitioner){
				selected_practitioner = d.get_value('practitioner');
				show_slots(d, fd);
			}
		};
		d.show();
	}

	function show_slots(d, fd) {
		if (d.get_value('appointment_date') && d.get_value('practitioner')){
			fd.available_slots.html("");
      let dToday = moment(d.get_value('appointment_date'), 'YY-MM-DD') - moment(frappe.datetime.get_today(), 'YY-MM-DD');
      
      if (dToday < 0) {
        fd.available_slots.html("Choose a valid date not in the past.".bold());
        d.set_value("appointment_time", null);
      } else {
			 frappe.call({
				method: 'appointment_booking.appointment_booking.doctype.visitor_appointment.visitor_appointment.get_availability_data',
				args: {
					practitioner: d.get_value('practitioner'),
					date: d.get_value('appointment_date')
				},
				callback: (r) => {
					var data = r.message;
					if(data.slot_details.length > 0) {
						var $wrapper = d.fields_dict.available_slots.$wrapper;

						// make buttons for each slot
						var slot_details = data.slot_details;
						var slot_html = "";
						for (let i = 0; i < slot_details.length; i++) {
							slot_html = slot_html + `<label>${slot_details[i].slot_name}</label>`;
							slot_html = slot_html + `<br/>` + slot_details[i].available_slots.map(slot => {
								let disabled = '';
								let start_str = slot.from_time;
								let slot_start_time = moment(slot.from_time, 'HH:mm:ss');
								let slot_to_time = moment(slot.to_time, 'HH:mm:ss');
								let interval = (slot_to_time - slot_start_time)/60000 | 0;
								// iterate in all booked appointments, update the start time and duration
								slot_details[i].appointments.forEach(function(booked) {
									let booked_moment = moment(booked.appointment_time, 'HH:mm:ss');
									let end_time = booked_moment.clone().add(booked.duration, 'minutes');
									// Deal with 0 duration appointments
									if(booked_moment.isSame(slot_start_time) || booked_moment.isBetween(slot_start_time, slot_to_time)){
										if(booked.duration == 0){
											disabled = 'disabled="disabled"';
											return false;
										}
									}
									// Check for overlaps considering appointment duration
									if(slot_start_time.isBefore(end_time) && slot_to_time.isAfter(booked_moment)){
										// There is an overlap
										disabled = 'disabled="disabled"';
										return false;
									}
								});
								return `<button class="btn btn-default"
									data-name=${start_str}
									data-duration=${interval}
									style="margin: 0 10px 10px 0; width: 72px;" ${disabled}>
									${start_str.substring(0, start_str.length - 3)}
								</button>`;
							}).join("");
							slot_html = slot_html + `<br/>`;
						}

						$wrapper
							.css('margin-bottom', 0)
							.addClass('text-center')
							.html(slot_html);

						// blue button when clicked
						$wrapper.on('click', 'button', function() {
							var $btn = $(this);
							$wrapper.find('button').removeClass('btn-primary');
							$btn.addClass('btn-primary');
							selected_slot = $btn.attr('data-name');
							duration = $btn.attr('data-duration');
							// enable dialog action
							d.get_primary_btn().attr('disabled', null);
						});

					}else {
						fd.available_slots.html("Choose a valid date.".bold())
						show_empty_state(d.get_value('practitioner'), d.get_value('appointment_date'));
					}
				},
				freeze: true,
				freeze_message: __("Fetching records......") 
			 });
      }
		}else{
			fd.available_slots.html("Department, Practitioner and Date are mandatory".bold());
		}
	}
};

var btn_update_status = function(frm, status){
	var doc = frm.doc;
	frappe.confirm(__('Are you sure to modify the appointment?'),
		function() {
			frappe.call({
				method:
				"appointment_booking.appointment_booking.doctype.visitor_appointment.visitor_appointment.update_status",
				args: {appointment_id: doc.name, status:status},
				callback: function(data){
					if(!data.exc){
						frm.reload_doc();
					}
				}
			});
		}
	);
};

frappe.ui.form.on("Visitor Appointment", "practitioner", function(frm) {
	if(frm.doc.practitioner){
		frappe.call({
			"method": "frappe.client.get",
			args: {
				doctype: "Service Practitioner",
				name: frm.doc.practitioner
			},
			callback: function (data) {
				frappe.model.set_value(frm.doctype,frm.docname, "department",data.message.department);
			}
		});
	}
});

frappe.ui.form.on("Visitor Appointment", "appointment_type", function(frm) {
	if(frm.doc.appointment_type) {
		frappe.call({
			"method": "frappe.client.get",
			args: {
				doctype: "Appointment Type",
				name: frm.doc.appointment_type
			},
			callback: function (data) {
				frappe.model.set_value(frm.doctype,frm.docname, "duration",data.message.default_duration);
			}
		});
	}
});

frappe.ui.form.on("Visitor Appointment", "visitor", function(frm) {
  if (!validate_email(frm.doc.visitor)) {
    frappe.msgprint(__("You have not entered a valid email"));
    frm.set_value("visitor",null);
  }
  
});
