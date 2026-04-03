{{- define "docs-ricearaul-com.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
