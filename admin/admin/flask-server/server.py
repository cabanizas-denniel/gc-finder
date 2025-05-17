from flask import Flask, request, send_file
app = Flask(__name__)

@app.route('/api/generate_report')
def generate_report():
    report_type = request.args.get('type')
    from_date = request.args.get('from')
    to_date = request.args.get('to')
    file_format = request.args.get('format', 'xlsx')
    #Dito ilalagay yung generation logic
    filename = generate_report_file(report_type, from_date, to_date, file_format)
    return send_file(filename, as_attachment=True)