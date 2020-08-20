<div class="container row">
  <table>
    <tr>
      <td style="width: 55%;">
        <h4>Se le recuerda su cita <b>#{{ doc.name }}</b></h4>
        <p><b>Solicitante</b>: {{ doc.visitor_name }}<br>
        <b>Motivo</b>: {{ doc.appointment_type }}<br>
        <b>Maxima Reserva</b>: {{ doc.duration }} minutos<br>
        <b>Fecha</b>: {{ doc.get_formatted('appointment_date') }}<br>
        <b>Hora</b>: {{ doc.appointment_time }}<br>
        <b>Servicio</b>: {{ doc.department }}<br>
        <b>Profesional</b>: {{ doc.practitioner }}<br>
        <b>Observaciones</b>: <i>{{ doc.notes }}</i><br>
        <b>Imprimir Cita:</b>{{ frappe.get_url() }}/Visitor%20Appointment/{{ doc.name }}
      </td>
      <td style="width: 45%;">
        <img width="100%" src="{{ doc.qr_code }}" />
      </td>
    </tr>
  </table>
  <p>Le esperamos en el dia y hora indicados. Si desea modificar algo, todavía está a tiempo enviando correo electr&oacute;nico a <b>ventas@pibico.es</b> indicando en el asunto <b>"Modificaci&oacute;n a Cita #{{ doc.name }}"</b> o llamandonos por telefono<br>Saludos</p>
</div>