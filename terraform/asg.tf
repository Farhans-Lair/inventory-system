# ═══════════════════════════════════════════════════════════════════════════
# asg.tf — EC2 Auto Scaling Group for ECS
#
# Replaces Fargate with EC2-backed ECS.
# The ASG provisions ECS-optimized EC2 instances that register automatically
# with the ECS cluster. The ECS Capacity Provider manages scaling based on
# actual task demand — it adds instances when tasks can't be placed and
# removes them when utilization drops.
#
# Instance sizing: t3.large (2 vCPU / 8 GB) handles all 6 services
# with ~40% headroom for rolling deployments.
# ═══════════════════════════════════════════════════════════════════════════

# Latest ECS-optimized Amazon Linux 2023 AMI
data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-ecs-hvm-*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── IAM instance profile for EC2 ECS instances ────────────────────────────
resource "aws_iam_role" "ecs_instance" {
  name = "${local.prefix}-ecs-instance-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_instance" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# SSM access — lets you shell into instances without SSH key
resource "aws_iam_role_policy_attachment" "ecs_instance_ssm" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ecs_instance" {
  name = "${local.prefix}-ecs-instance-profile"
  role = aws_iam_role.ecs_instance.name
}

# ── Security group for EC2 ECS instances ──────────────────────────────────
# Previously allowed all 65535 ports from anywhere in the VPC CIDR. Since
# ECS tasks already run in awsvpc mode with their own dedicated security
# group (aws_security_group.ecs), the host-level group here only needs to
# allow the ECS agent's own traffic plus the same service ports — not every
# port for every address in the VPC (which would include RDS, NAT, and
# anything else ever added to this network).
resource "aws_security_group" "ec2_ecs" {
  name        = "${local.prefix}-sg-ec2-ecs"
  description = "EC2 ECS instances - scoped to service ports + ECS agent"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.service_ports
    content {
      description = "${ingress.key} service port (task ENIs on this host)"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = [var.vpc_cidr]
    }
  }

  # ECS agent <-> ECS service control plane traffic between instances
  ingress {
    description = "ECS agent introspection (51678/51679)"
    from_port   = 51678
    to_port     = 51679
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── Launch Template ────────────────────────────────────────────────────────
resource "aws_launch_template" "ecs" {
  name_prefix   = "${local.prefix}-ecs-lt-"
  image_id      = data.aws_ami.ecs_optimized.id
  instance_type = var.ec2_instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance.name
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.ec2_ecs.id]
    delete_on_termination       = true
  }

  # Register EC2 instance with ECS cluster on boot
  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_CONTAINER_METADATA=true"       >> /etc/ecs/ecs.config
    echo "ECS_ENABLE_AWSLOGS_EXECUTIONROLE_OVERRIDE=true" >> /etc/ecs/ecs.config
  EOF
  )

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  monitoring { enabled = true }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${local.prefix}-ecs-instance"
    }
  }

  lifecycle { create_before_destroy = true }
}

# ── Auto Scaling Group ─────────────────────────────────────────────────────
resource "aws_autoscaling_group" "ecs" {
  name                      = "${local.prefix}-ecs-asg"
  min_size                  = var.ec2_min_instances
  max_size                  = var.ec2_max_instances
  desired_capacity          = var.ec2_desired_instances
  vpc_zone_identifier       = aws_subnet.private[*].id
  health_check_type         = "EC2"
  health_check_grace_period = 300

  # Protect instances from scale-in while ECS tasks are running
  protect_from_scale_in = true

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${local.prefix}-ecs-instance"
    propagate_at_launch = true
  }
  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }

  lifecycle {
    ignore_changes = [desired_capacity]
  }
}

# ── ECS Capacity Provider — links the ASG to ECS ──────────────────────────
resource "aws_ecs_capacity_provider" "ec2" {
  name = "${local.prefix}-ec2-cp"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecs.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = 80   # keep instances at 80% utilization
      minimum_scaling_step_size = 1
      maximum_scaling_step_size = 3
      instance_warmup_period    = 300
    }
  }
}

output "ecs_asg_name" {
  value = aws_autoscaling_group.ecs.name
}
