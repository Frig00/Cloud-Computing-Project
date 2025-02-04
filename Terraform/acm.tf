// aws_acm_certificate_validation 

// aws_acm_certificate
// create_before_destroy = true

// aws_route53_record


resource "aws_acm_certificate" "cert" {
  domain_name       = "sunomi.eu"
  subject_alternative_names = ["*.sunomi.eu"]
  validation_method = "DNS"

  tags = {
    Name = "ACM Certificate"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Validate ACM certificate
resource "aws_acm_certificate_validation" "cert_validation" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_acm_certificate.cert.domain_validation_options : record.resource_record_name]
  
  timeouts {
    create = "1h"
  }
}


resource "aws_route53_record" "www" {
  zone_id = "Z05564128L0HRRR5IZVP"
  name    = "api.sunomi.eu"
  type    = "A"

  alias {
    name                   = aws_lb.controller.dns_name
    zone_id               = "Z32O12XQLNTSW2"  # This is the fixed zone_id for eu-west-1 ALBs
    evaluate_target_health = true
  }
}