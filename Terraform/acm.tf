// aws_acm_certificate_validation 

// aws_acm_certificate
// create_before_destroy = true

// aws_route53_record
# Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "cert_frontend" {
  provider = aws.us_east_1
  domain_name       = "sunomi.eu"
  subject_alternative_names = ["*.sunomi.eu"]
  validation_method = "DNS"

  tags = {
    Name = "ACM Certificate Frontend"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "cert_frontend_validation" {
  provider = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cert_frontend.arn
  validation_record_fqdns = [for record in aws_acm_certificate.cert_frontend.domain_validation_options : record.resource_record_name]
  
  timeouts {
    create = "1h"
  }
}

# Certificate for ALB (must be in eu-west-1)
resource "aws_acm_certificate" "cert_controller" {
  domain_name       = "sunomi.eu"
  subject_alternative_names = ["*.sunomi.eu"]  
  validation_method = "DNS"

  tags = {
    Name = "ACM Certificate Controller"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "cert_controller_validation" {
  provider = aws.eu_west_1  # Explicitly specify eu-west-1 provider
  certificate_arn         = aws_acm_certificate.cert_controller.arn
  validation_record_fqdns = [for record in aws_acm_certificate.cert_controller.domain_validation_options : record.resource_record_name]
  
  timeouts {
    create = "1h"
  }
}

resource "aws_route53_record" "api" {
  zone_id = "Z05564128L0HRRR5IZVP"
  name    = "api.sunomi.eu"
  type    = "A"

  alias {
    name                   = aws_lb.controller.dns_name
    zone_id               = "Z32O12XQLNTSW2"  # This is the fixed zone_id for eu-west-1 ALBs
    evaluate_target_health = true
  }
}