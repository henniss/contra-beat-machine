variable "domain_name" {
  description = "Domain the site is served on; it goes on the certificate and the distribution."
  type        = string
  default     = "enniss.net"
}

variable "site_path" {
  description = "Folder the site is served from, e.g. \"contra\" for https://enniss.net/contra/."
  type        = string
  default     = "contra"
}

variable "budget_email" {
  description = "Address that receives budget alerts."
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.budget_email))
    error_message = "budget_email must be an email address."
  }
}

variable "budget_limit_usd" {
  description = "Monthly cost budget, in US dollars."
  type        = number
  default     = 5
}
